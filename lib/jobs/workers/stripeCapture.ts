import { getErrorMessage } from '@/lib/utils/error'
/**
 * Stripe Capture Worker
 * Handles payment intent capture with idempotency
 */

import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Job } from '../queue'

export async function handleStripeCapture(job: Job): Promise<void> {
  const { escrowId, paymentIntentId } = job.data

  if (!escrowId || !paymentIntentId) {
    throw new Error('Missing escrowId or paymentIntentId in stripe capture job')
  }

  console.log(`[STRIPE CAPTURE WORKER] Processing capture for escrow ${escrowId}`)

  // Check if already captured (idempotency check)
  const { data: existingTx } = await supabaseAdmin
    .from('escrow_transactions')
    .select('stripe_capture_status, lock_version')
    .eq('id', escrowId)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existingTx?.stripe_capture_status === 'captured') {
    console.log(`[STRIPE CAPTURE WORKER] Escrow ${escrowId} already captured. Skipping.`)
    return
  }

  try {
    // Capture the payment intent in Stripe with idempotency key
    const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      idempotencyKey: `${paymentIntentId}_capture_${escrowId}`,
    })

    console.log(`[STRIPE CAPTURE WORKER] Captured PI ${paymentIntentId}`)

    // Update escrow_transactions to mark as captured
    const { data: updatedTx, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        stripe_capture_status: 'captured',
        stripe_capture_completed_at: new Date().toISOString(),
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
      throw new Error(`[STRIPE CAPTURE WORKER] Optimistic lock conflict for escrow ${escrowId}; retry required`)
    }

    console.log(`[STRIPE CAPTURE WORKER] Updated escrow ${escrowId} status to captured`)
  } catch (error: unknown) {
    console.error(`[STRIPE CAPTURE WORKER] Capture failed for ${escrowId}:`, getErrorMessage(error))
    throw error
  }
}
