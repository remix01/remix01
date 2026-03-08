/**
 * Stripe Worker — Handle payment operations asynchronously
 * 
 * Jobs:
 * - stripe_capture_payment: Capture payment intent (after release confirmed)
 * - stripe_refund_payment: Refund payment (already handled sync, but job for audit)
 */

import { Job } from '../queue'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface StripeJobPayload {
  transactionId: string
  paymentIntentId: string
  amountCents?: number
  reason?: string
  metadata?: Record<string, any>
}

export async function handleStripeJob(job: Job<StripeJobPayload>): Promise<void> {
  const { type, payload } = job
  const { transactionId, paymentIntentId, amountCents, reason, metadata } = payload

  // Fetch transaction to verify state
  const { data: escrow } = await supabaseAdmin
    .from('escrow_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle()

  if (!escrow) {
    throw new Error(`[STRIPE] Escrow transaction not found: ${transactionId}`)
  }

  try {
    switch (type) {
      case 'stripe_capture_payment': {
        console.log(`[STRIPE] Capturing payment ${paymentIntentId}`)
        
        const captured = await stripe.paymentIntents.capture(paymentIntentId, {
          amount_to_capture: amountCents || escrow.amount_cents,
        })

        console.log(`[STRIPE] Captured payment ${captured.id}`, {
          amountCents: captured.amount,
          status: captured.status,
        })
        break
      }

      case 'stripe_refund_payment': {
        console.log(`[STRIPE] Refunding payment ${paymentIntentId}`)
        
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
          reason: (reason as any) || 'requested_by_customer',
          metadata,
        })

        console.log(`[STRIPE] Refund created ${refund.id}`, {
          amountCents: refund.amount,
          status: refund.status,
        })
        break
      }

      default:
        throw new Error(`Unknown Stripe job type: ${type}`)
    }
  } catch (error: any) {
    console.error(`[STRIPE] Job failed for transaction ${transactionId}:`, error)
    
    // Stripe errors might be retryable
    if (error.statusCode && error.statusCode >= 500) {
      // Server error — safe to retry
      throw error
    } else if (error.statusCode === 429) {
      // Rate limit — safe to retry
      throw error
    } else {
      // Client error (4xx) — don't retry
      throw new Error(`[STRIPE] Non-retryable error: ${error.message}`)
    }
  }
}
