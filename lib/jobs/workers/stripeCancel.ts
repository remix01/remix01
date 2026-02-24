import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Job } from '../queue'

/**
 * Cancel a payment intent in Stripe (async job)
 * Used for refunds or dispute resolutions
 * Runs after DB transaction commits
 * Idempotent: safe to retry multiple times
 */
export async function handleStripeCancel(job: Job) {
  const { paymentIntentId, escrowId, reason } = job.data

  if (!paymentIntentId || !escrowId) {
    throw new Error('Missing paymentIntentId or escrowId in job data')
  }

  try {
    console.log(`[STRIPE] Cancelling payment intent: ${paymentIntentId}`)

    // Cancel payment with idempotency key
    // Using paymentIntentId + 'cancel' as idempotency key ensures this is truly idempotent
    const cancelled = await stripe.paymentIntents.cancel(paymentIntentId, {
      idempotencyKey: `${paymentIntentId}_cancel_${escrowId}`,
      cancellation_reason: 'requested_by_customer', // or 'fraudulent', 'requested_by_customer', 'duplicate'
    })

    if (cancelled.status === 'canceled') {
      console.log(`[STRIPE] Successfully cancelled PI: ${paymentIntentId}`)

      // Update escrow record to mark Stripe cancellation
      const { error: updateError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({
          stripe_cancelled_at: new Date().toISOString(),
        })
        .eq('id', escrowId)

      if (updateError) {
        console.error(`[STRIPE] Failed to update escrow after cancel: ${updateError.message}`)
        throw updateError
      }
    } else {
      throw new Error(`Stripe cancel returned status: ${cancelled.status}`)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[STRIPE] Cancel failed for PI ${paymentIntentId}: ${errorMsg}`)
    throw err // Let queue handle retries
  }
}
