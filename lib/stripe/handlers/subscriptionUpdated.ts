import Stripe from 'stripe'
import { subscriptionService } from '@/lib/services/subscription.service'

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  if (event.type === 'customer.subscription.deleted') {
    const customerId = subscription.customer as string
    await subscriptionService.updateSubscription(null, customerId, 'start', subscription.id)
    return
  }

  if (subscription.status !== 'active') return

  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id ?? ''
  const tier = subscriptionService.tierFromPriceId(priceId)
  const userId = event.type === 'customer.subscription.created'
    ? subscription.metadata?.user_id ?? null
    : null

  await subscriptionService.updateSubscription(userId, customerId, tier, subscription.id)
}
