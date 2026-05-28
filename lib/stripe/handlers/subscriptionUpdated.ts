import Stripe from 'stripe'
import { subscriptionService } from '@/lib/services/subscription.service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendSubscriptionExpiringNotification } from '@/lib/agents/notifications/smartNotificationAgent'

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  if (!customerId) {
    throw new Error(`[WEBHOOK] ${event.type} missing customer ID`)
  }

  if (event.type === 'customer.subscription.deleted') {
    await subscriptionService.updateSubscription(null, customerId, 'start', subscription.id)
    return
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    await subscriptionService.updateSubscription(null, customerId, 'start', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price.id ?? ''
  const tier = subscriptionService.tierFromPriceId(priceId)
  const userId = event.type === 'customer.subscription.created'
    ? subscription.metadata?.user_id ?? null
    : null

  await subscriptionService.updateSubscription(userId, customerId, tier, subscription.id)

  // SUBSCRIPTION_EXPIRING_7D: fire when cancel_at_period_end and ≤7 days left.
  // In Stripe SDK v20, cancel_at holds the period-end timestamp when
  // cancel_at_period_end=true. Non-blocking — failure must not fail webhook.
  const cancelAtUnix = subscription.cancel_at
  if (subscription.cancel_at_period_end && subscription.status === 'active' && cancelAtUnix) {
    const daysUntilExpiry = (cancelAtUnix * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
      maybeNotifySubscriptionExpiring(customerId, cancelAtUnix, tier).catch((e) =>
        console.error('[WEBHOOK] SUBSCRIPTION_EXPIRING_7D notification failed:', e)
      )
    }
  }
}

/**
 * Send SUBSCRIPTION_EXPIRING_7D notification with per-billing-cycle idempotency.
 * Uses notification_logs to guard against duplicate sends within the same period.
 */
async function maybeNotifySubscriptionExpiring(
  customerId: string,
  cancelAtUnix: number,
  tier: string
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile?.id || !profile?.email) return

  // Idempotency: skip if already sent in this billing cycle.
  // Window = 8 days before cancel_at to tolerate webhook retry jitter.
  const cycleWindowStart = new Date(
    (cancelAtUnix - 8 * 24 * 60 * 60) * 1000
  ).toISOString()

  const { data: existing } = await supabaseAdmin
    .from('notification_logs')
    .select('id')
    .eq('recipient_id', profile.id)
    .eq('type', 'SUBSCRIPTION_EXPIRING_7D')
    .gt('sent_at', cycleWindowStart)
    .limit(1)

  if (existing?.length) return

  const tierLabel = tier === 'pro' ? 'PRO' : tier === 'elite' ? 'ELITE' : 'START'
  const expiryDate = new Date(cancelAtUnix * 1000).toLocaleDateString('sl-SI')

  await sendSubscriptionExpiringNotification(
    profile.id,
    profile.email,
    tierLabel as 'START' | 'PRO',
    expiryDate
  )
}
