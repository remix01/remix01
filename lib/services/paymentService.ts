/**
 * Payment Service - Extracted from app/api/payments/* routes
 * Handles payment operations and escrow
 * 
 * Emits payment.released events for subscribers to act on (analytics, notifications, etc.)
 */

import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent } from '@/lib/mcp/payments'
import { ServiceError } from './serviceError'
import { eventBus } from '@/lib/events'
import { getCommissionRate } from '@/lib/stripe/helpers'
import { stripe } from '@/lib/stripe/client'
import type { PlanType } from '@/lib/stripe/config'
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'

export const paymentService = {
  /**
   * Create payment intent for a ponudba
   * Business logic extracted from POST /api/payments/create-intent
   */
  async createPaymentIntent(
    userId: string,
    ponudbaId: string,
    userEmail: string
  ) {
    const supabase = await createClient()

    // Verify user role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    const profile = profileData as { role: string | null } | null

    if (!profile || profile.role !== 'narocnik') {
      throw new ServiceError(
        'Unauthorized - not a narocnik',
        'FORBIDDEN',
        403
      )
    }

    // Fetch ponudba with povprasevanje
    const { data: ponudba, error: ponudbaError } = await supabase
      .from('ponudbe')
      .select(`
        *,
        povprasevanja(*)
      `)
      .eq('id', ponudbaId)
      .single()

    if (ponudbaError || !ponudba) {
      throw new ServiceError(
        'Ponudba not found',
        'NOT_FOUND',
        404
      )
    }

    // Verify ponudba status
    if (ponudba.status !== 'sprejeta') {
      throw new ServiceError(
        'Ponudba must be accepted first',
        'VALIDATION',
        400
      )
    }

    // Verify ownership - narocnik must own the povprasevanje
    const povprasevanje = ponudba.povprasevanja
    if (povprasevanje.narocnik_id !== userId) {
      throw new ServiceError(
        'Unauthorized - not the povprasevanje owner',
        'FORBIDDEN',
        403
      )
    }

    // Create payment intent
    const amount = Math.round((ponudba.price_estimate || 0) * 100)
    const result = await createPaymentIntent({
      amount,
      povprasevanjeId: ponudba.povprasevanje_id,
      ponudbaId,
      narocnikEmail: userEmail,
    })

    if (result.error) {
      throw new ServiceError(
        result.error,
        'DB_ERROR',
        500
      )
    }

    return {
      clientSecret: result.clientSecret,
      amount,
      currency: 'eur',
    }
  },

  /**
   * Process payment release after task completion
   * Emits payment.released event for subscribers (analytics, notifications, etc.)
   *
   * Commission rates are plan-aware (via getCommissionRate):
   *   START plan → 10%  |  PRO plan → 5%
   * These match the rates documented in README.md.
   *
   * TODO: Integrate with Stripe transfer API to actually disburse netAmount
   * to the partner's connected Stripe account.
   */
  async releasePayment(taskId: string, partnerId: string, amount: number) {
    const supabase = await createClient()

    const [{ data: partnerProfile }, { data: obrtnikProfile }] = await Promise.all([
      supabase.from('profiles').select('subscription_tier').eq('id', partnerId).single(),
      supabase.from('obrtnik_profiles').select('stripe_account_id').eq('id', partnerId).single(),
    ])

    const plan: PlanType = partnerProfile?.subscription_tier === 'pro' ? 'PRO' : 'START'
    const commissionPercent = getCommissionRate(plan)
    const commissionAmount = Math.round(amount * (commissionPercent / 100) * 100) / 100
    const netAmount = amount - commissionAmount
    const netAmountCents = Math.round(netAmount * 100)

    let stripeTransferId: string | undefined

    if (obrtnikProfile?.stripe_account_id) {
      const transfer = await (stripe as any).transfers.create({
        amount: netAmountCents,
        currency: 'eur',
        destination: obrtnikProfile.stripe_account_id,
        metadata: { taskId, partnerId },
        description: `LiftGO izplačilo za nalogo ${taskId}`,
      })
      stripeTransferId = transfer.id

      await supabase.from('payouts').insert({
        obrtnik_id: partnerId,
        amount_eur: amount,
        commission_eur: commissionAmount,
        stripe_transfer_id: transfer.id,
        status: 'completed',
      })
    } else {
      console.warn(`[paymentService] Obrtnik ${partnerId} nima Stripe računa — izplačilo preskočeno`)
    }

    trackFunnelEvent(FUNNEL_EVENTS.PAYMENT_COMPLETED, {
      povprasevanje_id: taskId,
      user_type: 'system',
      obrtnik_id: partnerId,
    }, partnerId)

    await eventBus.emit('payment.released', {
      taskId,
      partnerId,
      amount,
      commission: commissionAmount,
      netAmount,
      releasedAt: new Date().toISOString(),
      stripeTransferId,
    })

    return {
      taskId,
      partnerId,
      amount,
      commission: commissionAmount,
      netAmount,
      stripeTransferId,
    }
  },
}
