import { getErrorMessage } from '@/lib/utils/error'
/**
 * Stripe Release Worker
 * Handles payment intent cancellation/refund with idempotency
 */

import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Job } from '../queue'

export async function handleStripeRelease(job: Job): Promise<void> {
  const { escrowId, paymentIntentId, action } = job.data

  if (!escrowId || !paymentIntentId) {
    throw new Error('Missing escrowId or paymentIntentId in stripe release job')
  }

  const releaseAction = action ?? 'cancel' // 'cancel' or 'refund'

  console.log(`[STRIPE RELEASE WORKER] Processing ${releaseAction} for escrow ${escrowId}`)

  // Check if already released (idempotency check)
  const { data: existingTx } = await supabaseAdmin
    .from('escrow_transactions')
    .select('stripe_release_status, lock_version')
    .eq('id', escrowId)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existingTx?.stripe_release_status === releaseAction) {
    console.log(`[STRIPE RELEASE WORKER] Escrow ${escrowId} already ${releaseAction}. Skipping.`)
    return
  }

  try {
    if (releaseAction === 'cancel') {
      await stripe.paymentIntents.cancel(paymentIntentId)
      console.log(`[STRIPE RELEASE WORKER] Cancelled PI ${paymentIntentId}`)
    } else if (releaseAction === 'refund') {
      // For refunds, we need to refund the charge, not cancel the intent
      const { data: intent } = await supabaseAdmin
        .from('escrow_transactions')
        .select('stripe_charge_id')
        .eq('id', escrowId)
        .maybeSingle()

      if (intent?.stripe_charge_id) {
        await stripe.refunds.create({
          charge: intent.stripe_charge_id,
        })
        console.log(`[STRIPE RELEASE WORKER] Refunded charge ${intent.stripe_charge_id}`)
      } else {
        throw new Error('No charge ID found for refund')
      }
    }

    // Update escrow_transactions to mark as released
    const { data: updatedTx, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        stripe_release_status: releaseAction,
        stripe_release_completed_at: new Date().toISOString(),
        lock_version: (existingTx?.lock_version ?? 0) + 1,
      })
      .eq('id', escrowId)
      .eq('lock_version', existingTx?.lock_version ?? 0)
      .select('id')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!existingTx || !updatedTx) {
      throw new Error(`[STRIPE RELEASE WORKER] Optimistic lock conflict for escrow ${escrowId}; retry required`)
    }

    console.log(`[STRIPE RELEASE WORKER] Updated escrow ${escrowId} status to ${releaseAction}`)
  } catch (error: unknown) {
    console.error(`[STRIPE RELEASE WORKER] Release failed for ${escrowId}:`, getErrorMessage(error))
    throw error
  }
}
