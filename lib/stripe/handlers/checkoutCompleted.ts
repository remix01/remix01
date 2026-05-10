import Stripe from 'stripe'
import { stripe as stripeProxy } from '@/lib/stripe'
import { subscriptionService } from '@/lib/services/subscription.service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue } from '@/lib/jobs/queue'

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

  // Send subscription confirmation email
  try {
    let recipientEmail: string | null = session.customer_email ?? null
    let recipientName = ''

    if (!recipientEmail && userId) {
      const { data: profile } = await supabaseAdmin
        .from('obrtnik_profiles')
        .select('email, ime, priimek')
        .eq('user_id', userId)
        .maybeSingle()
      recipientEmail = profile?.email ?? null
      recipientName = profile ? `${profile.ime ?? ''} ${profile.priimek ?? ''}`.trim() : ''
    }

    if (recipientEmail) {
      const tierLabel = tier === 'pro' ? 'PRO' : tier === 'elite' ? 'ELITE' : 'START'
      await enqueue('sendEmail', {
        to: recipientEmail,
        template: 'subscription_activated',
        customData: { recipientName, tier, tierLabel, subscriptionId },
      })
    }
  } catch (err) {
    console.error('[WEBHOOK] checkout.session.completed: subscription email failed', err)
  }
}
