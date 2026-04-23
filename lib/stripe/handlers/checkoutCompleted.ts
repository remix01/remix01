import Stripe from 'stripe'
import { stripe as stripeProxy } from '@/lib/stripe'
import { subscriptionService } from '@/lib/services/subscription.service'

export async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.mode !== 'subscription') return

  const userId = session.client_reference_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  if (!customerId) return

  let tier: 'start' | 'pro' | 'elite' = 'start'
  if (subscriptionId) {
    const subscription = await stripeProxy.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0]?.price.id ?? ''
    tier = subscriptionService.tierFromPriceId(priceId)
  }

  await subscriptionService.updateSubscription(userId, customerId, tier, subscriptionId)
}
