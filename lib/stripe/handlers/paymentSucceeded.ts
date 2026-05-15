import Stripe from 'stripe'
import { subscriptionService } from '@/lib/services/subscription.service'
import { applyStripePaymentEvent } from '@/lib/services/paymentStateService'

export async function handlePaymentSucceeded(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  const paymentTier = await subscriptionService.resolveTierFromPaymentIntent(pi)
  const paymentUserId = pi.metadata?.user_id || pi.metadata?.obrtnik_id || null
  const customerId = typeof pi.customer === 'string' ? pi.customer : null

  if (paymentTier && customerId) {
    await subscriptionService.updateSubscription(paymentUserId, customerId, paymentTier)
  }

  await applyStripePaymentEvent({
    stripeEvent: event,
    paymentIntentId: pi.id,
    eventKind: 'payment_succeeded',
    extraFields: { paid_at: new Date().toISOString() },
    metadata: { stripeEventType: event.type, piStatus: pi.status },
  })
}
