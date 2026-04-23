import Stripe from 'stripe'
import { getEscrowByPaymentIntent, updateEscrowStatus } from '@/lib/escrow'
import { subscriptionService } from '@/lib/services/subscription.service'

export async function handlePaymentSucceeded(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  const paymentTier = await subscriptionService.resolveTierFromPaymentIntent(pi)
  const paymentUserId = pi.metadata?.user_id || pi.metadata?.obrtnik_id || null
  const customerId = typeof pi.customer === 'string' ? pi.customer : null

  if (paymentTier && customerId) {
    await subscriptionService.updateSubscription(paymentUserId, customerId, paymentTier)
  }

  try {
    const escrow = await getEscrowByPaymentIntent(pi.id)
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus: 'paid',
      actor: 'system',
      actorId: 'stripe-webhook',
      stripeEventId: event.id,
      extraFields: { paid_at: new Date().toISOString() },
      metadata: { stripeEventType: event.type, piStatus: pi.status },
    })
  } catch {
    console.log('[WEBHOOK] payment_intent.succeeded without escrow row:', pi.id)
  }
}
