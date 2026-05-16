/**
 * Payment Service - Extracted from app/api/payments/* routes
 * Handles payment operations and escrow
 * 
 * Emits payment.released events for subscribers to act on (analytics, notifications, etc.)
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createPaymentIntent } from '@/lib/mcp/payments'
import { ServiceError } from './serviceError'
import { eventBus } from '@/lib/events'
import { getCommissionRate } from '@/lib/stripe/helpers'
import { stripe } from '@/lib/stripe/client'
import type { PlanType } from '@/lib/stripe/config'
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'
import { enqueue } from '@/lib/jobs/queue'

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

    const { data: partnerProfile } = await supabase
      .from('profiles').select('subscription_tier').eq('id', partnerId).single()

    const plan: PlanType = partnerProfile?.subscription_tier === 'pro' ? 'PRO' : 'START'
    const commissionPercent = getCommissionRate(plan)
    const commissionAmount = Math.round(amount * (commissionPercent / 100) * 100) / 100
    const netAmount = amount - commissionAmount
    const netAmountCents = Math.round(netAmount * 100)

    const stripeTransferId: string | undefined = undefined
    // Connect transfers handled via Stripe webhooks (obrtnik_profiles has no stripe_account_id)
    console.warn(`[paymentService] Obrtnik ${partnerId} nima Stripe računa — izplačilo preskočeno`)

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

  /**
   * Capture (confirm) a Stripe payment intent after customer confirms payment.
   * Returns the payment intent ID as chargeId for downstream steps.
   */
  async confirmCharge(paymentIntentId: string): Promise<{ chargeId: string }> {
    const captured = await stripe.paymentIntents.capture(paymentIntentId)
    if (captured.status !== 'succeeded') {
      throw new ServiceError(
        `Payment capture failed: intent ${paymentIntentId} status is ${captured.status}`,
        'DB_ERROR',
        500
      )
    }
    return { chargeId: captured.id }
  },

  /**
   * Refund a captured payment intent. Used as compensation for confirmCharge.
   */
  async refundCharge(chargeId: string): Promise<void> {
    const refund = await stripe.refunds.create({
      payment_intent: chargeId,
      reason: 'requested_by_customer',
    })
    if (refund.status === 'failed') {
      throw new ServiceError(
        `Refund failed for charge ${chargeId}: ${refund.failure_reason ?? 'unknown'}`,
        'DB_ERROR',
        500
      )
    }
  },

  /**
   * Create an escrow record in the DB after payment is captured.
   * Column names match supabase/migrations/20260215100000_create_escrow_tables.sql.
   * Calculates commission from partner's subscription plan.
   */
  async holdEscrow(
    inquiryId: string,
    paymentIntentId: string,
    amount: number,
    partnerId: string,
    customerEmail: string,
  ): Promise<{ escrowId: string }> {
    const supabase = createAdminClient()

    const { data: partnerProfile } = await (supabase as any)
      .from('profiles')
      .select('subscription_tier')
      .eq('id', partnerId)
      .single()

    const plan: PlanType = partnerProfile?.subscription_tier === 'pro' ? 'PRO' : 'START'
    const commissionPercent = getCommissionRate(plan)
    const commissionRateDecimal = commissionPercent / 100
    const totalCents = Math.round(amount * 100)
    const commissionCents = Math.round(totalCents * commissionRateDecimal)
    const payoutCents = totalCents - commissionCents

    const { data, error } = await (supabase as any)
      .from('escrow_transactions')
      .insert({
        inquiry_id: inquiryId,
        partner_id: partnerId,
        customer_email: customerEmail,
        stripe_payment_intent_id: paymentIntentId,
        amount_total_cents: totalCents,
        commission_rate: commissionRateDecimal,
        commission_cents: commissionCents,
        payout_cents: payoutCents,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new ServiceError(
        `Failed to create escrow record: ${error?.message ?? 'unknown'}`,
        'DB_ERROR',
        500
      )
    }
    return { escrowId: data.id as string }
  },

  /**
   * Refund a held escrow payment. Used as compensation for holdEscrow.
   * Idempotent: skips if already refunded or cancelled.
   */
  async releaseEscrow(escrowId: string): Promise<void> {
    const supabase = createAdminClient()
    const { data: escrow, error } = await (supabase as any)
      .from('escrow_transactions')
      .select('stripe_payment_intent_id, status')
      .eq('id', escrowId)
      .single()

    if (error || !escrow) {
      throw new ServiceError(`Escrow ${escrowId} not found`, 'NOT_FOUND', 404)
    }

    if (escrow.status === 'refunded' || escrow.status === 'cancelled') return

    await stripe.refunds.create({ payment_intent: escrow.stripe_payment_intent_id })

    await (supabase as any)
      .from('escrow_transactions')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', escrowId)
  },

  /**
   * Schedule the delayed payout to the partner after the 24h dispute window.
   * Enqueues a release_escrow job via QStash.
   * paymentIntentId is required so the worker can verify the Stripe state.
   */
  async scheduleTransfer(
    escrowId: string,
    paymentIntentId: string,
    partnerId: string,
    amount: number,
    taskId: string,
  ): Promise<{ transferId: string }> {
    const DISPUTE_WINDOW_SECONDS = 24 * 60 * 60

    const messageId = await enqueue(
      'release_escrow',
      { escrowId, paymentIntentId, partnerId, amount, taskId },
      { delay: DISPUTE_WINDOW_SECONDS, retries: 3 },
    )

    return { transferId: messageId }
  },

  /**
   * Cancel a scheduled transfer by marking the escrow as cancelled.
   * QStash does not expose a message-cancel API in this client version,
   * so the worker checks escrow status before executing the transfer.
   */
  async cancelScheduledTransfer(transferId: string, escrowId?: string): Promise<void> {
    if (!escrowId) return

    const supabase = createAdminClient()
    await (supabase as any)
      .from('escrow_transactions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', escrowId)

    console.warn(
      `[paymentService] Transfer ${transferId} flagged as cancelled in DB. ` +
      `QStash message will no-op when worker checks escrow status.`
    )
  },
}
