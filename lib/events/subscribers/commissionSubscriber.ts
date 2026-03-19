/**
 * Commission Subscriber — Tracks commissions when payments are released
 * 
 * Listens for payment.released events and creates commission logs
 * for analytics and partner payout tracking.
 * 
 * Integrates with event bus for reliable, exactly-once delivery.
 */

import { eventBus } from '../eventBus'
import { idempotency } from '../idempotency'
import { commissionService } from '@/lib/services/commissionService'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminClient } from '@/lib/supabase/server'

export function registerCommissionSubscriber() {
  /**
   * When payment is released, create commission log and transfer to partner
   */
  eventBus.on('payment.released', async (payload) => {
    try {
      // Idempotency: skip if already processed
      const skip = await idempotency.checkAndMark(
        'payment.released',
        'commission',
        payload.taskId
      )
      if (skip) {
        console.log(`[CommissionSubscriber] Skipping duplicate event for task ${payload.taskId}`)
        return
      }

      console.log(`[CommissionSubscriber] Processing payment.released for task ${payload.taskId}`)

      // Find the escrow transaction and partner info
      const supabase = createAdminClient()
      
      // Fetch escrow transaction with partner details
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrow_transactions')
        .select(`
          *,
          partner:partner_id(
            id,
            stripe_account_id
          ),
          inquiry:inquiry_id(
            id
          )
        `)
        .eq('id', payload.taskId)
        .single()

      if (escrowError || !escrow) {
        console.error(
          `[CommissionSubscriber] Escrow not found for task ${payload.taskId}:`,
          escrowError
        )
        return
      }

      // Create commission log
      const commission = await commissionService.createCommissionLog({
        escrowId: escrow.id,
        partnerId: escrow.partner_id,
        inquiryId: escrow.inquiry_id,
        grossAmountCents: escrow.amount_total_cents,
        commissionRate: parseFloat(String(escrow.commission_rate)),
        stripeAccountId: escrow.partner?.stripe_account_id,
      })

      console.log(
        `[CommissionSubscriber] Commission log created: ${commission.id}, ` +
        `commission: €${commission.commission.toFixed(2)}, ` +
        `payout: €${commission.payout.toFixed(2)}`
      )

      // If partner has Stripe account, attempt transfer immediately
      if (escrow.partner?.stripe_account_id) {
        const transferResult = await commissionService.transferToPartner(
          commission.id,
          escrow.partner.stripe_account_id,
          escrow.payout_cents  // Partner gets the payout (total - commission)
        )

        if (transferResult.success) {
          console.log(
            `[CommissionSubscriber] Transfer successful: ${transferResult.transferId}`
          )
        } else {
          console.error(
            `[CommissionSubscriber] Transfer failed: ${transferResult.error}`
          )
          // Will be retried by cron job
        }
      } else {
        console.warn(
          `[CommissionSubscriber] No Stripe account for partner ${escrow.partner_id}, ` +
          `manual payout required`
        )
      }

    } catch (err) {
      console.error('[CommissionSubscriber] Error processing payment.released:', err)
      // Don't throw — let the event bus continue with other subscribers
    }
  })

  /**
   * When escrow is refunded, mark commission as refunded
   */
  eventBus.on('escrow.refunded', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark(
        'escrow.refunded',
        'commission',
        payload.transactionId
      )
      if (skip) return

      console.log(`[CommissionSubscriber] Processing escrow.refunded for ${payload.transactionId}`)

      // Find commission log for this escrow
      const { data: commission, error } = await supabaseAdmin
        .from('commission_logs')
        .select('id')
        .eq('escrow_id', payload.transactionId)
        .single()

      if (error || !commission) {
        console.warn(
          `[CommissionSubscriber] Commission log not found for escrow ${payload.transactionId}`
        )
        return
      }

      // Mark as refunded
      await commissionService.refundCommission(commission.id)
      console.log(`[CommissionSubscriber] Commission refunded: ${commission.id}`)

    } catch (err) {
      console.error('[CommissionSubscriber] Error processing escrow.refunded:', err)
    }
  })
}
