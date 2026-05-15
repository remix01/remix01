import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { applyStripePaymentEvent } from '@/lib/services/paymentStateService'

export async function reconcilePayments(limit = 100) {
  const { data: rows, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status, stripe_payment_intent_id')
    .not('stripe_payment_intent_id', 'is', null)
    .limit(limit)

  if (error) throw new Error(`reconcile query failed: ${error.message}`)

  const results: Array<{ paymentId: string; reconciled: boolean; reason?: string }> = []

  for (const row of rows ?? []) {
    const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id)
    const mappedKind = pi.status === 'succeeded' ? 'payment_succeeded' : pi.status === 'canceled' ? 'payment_failed' : null

    if (!mappedKind) {
      results.push({ paymentId: row.id, reconciled: false, reason: 'unsupported_stripe_status' })
      continue
    }

    const outcome = await applyStripePaymentEvent({
      stripeEvent: { id: `reconcile:${row.id}:${pi.id}`, type: `reconcile.${pi.status}` },
      paymentIntentId: row.stripe_payment_intent_id,
      eventKind: mappedKind,
      metadata: { reconciliation: true, stripeStatus: pi.status },
    })

    results.push({ paymentId: row.id, reconciled: outcome.applied, reason: outcome.reason })
  }

  return results
}
