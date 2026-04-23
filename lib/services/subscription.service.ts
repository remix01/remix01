import Stripe from 'stripe'
import { stripe as stripeProxy } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'

export type SubscriptionTier = 'start' | 'pro' | 'elite'

function normalizeTier(rawTier: string | null | undefined): SubscriptionTier | null {
  if (!rawTier) return null
  const normalized = rawTier.toLowerCase()
  if (normalized === 'start' || normalized === 'pro' || normalized === 'elite') return normalized
  return null
}

async function resolveProfileId(userId: string | null, customerId: string): Promise<string | null> {
  if (userId) return userId

  const { data: profileByCustomer } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (profileByCustomer?.id) return profileByCustomer.id

  const { data: obrtnikByCustomer } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  return obrtnikByCustomer?.id ?? null
}

export const subscriptionService = {
  tierFromPriceId(priceId: string): SubscriptionTier {
    if (priceId === STRIPE_PRODUCTS.PRO.priceId) return 'pro'
    if (priceId === STRIPE_PRODUCTS.ELITE.priceId) return 'elite'
    return 'start'
  },

  async resolveTierFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<SubscriptionTier | null> {
    const invoiceRef = (
      pi as Stripe.PaymentIntent & { invoice?: string | { id: string } | null }
    ).invoice

    if (invoiceRef) {
      try {
        const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef.id
        const invoice = await stripeProxy.invoices.retrieve(invoiceId, {
          expand: ['lines.data.price'],
        })
        const firstLine = invoice.lines?.data?.[0] as Stripe.InvoiceLineItem & {
          price?: { id?: string } | null
        }
        const priceId = firstLine?.price?.id
        if (priceId) return subscriptionService.tierFromPriceId(priceId)
      } catch (error) {
        console.error('[WEBHOOK] Failed to resolve invoice price for payment_intent:', pi.id, error)
      }
    }

    return normalizeTier(pi.metadata?.subscription_tier || pi.metadata?.package_tier)
  },

  async updateSubscription(
    userId: string | null,
    customerId: string,
    tier: SubscriptionTier,
    stripeSubscriptionId?: string
  ) {
    const profileId = await resolveProfileId(userId, customerId)

    if (!profileId) {
      console.error('[WEBHOOK] Ne morem najti profila za customerId:', customerId)
      return
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        subscription_tier: tier,
        ...(stripeSubscriptionId && { stripe_subscription_id: stripeSubscriptionId }),
      })
      .eq('id', profileId)

    if (error) {
      console.error('[WEBHOOK] Failed to update subscription:', error)
      return
    }

    const { error: obrtnikError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({
        stripe_customer_id: customerId,
        subscription_tier: tier,
      })
      .eq('id', profileId)

    if (obrtnikError) {
      console.error('[WEBHOOK] Failed to mirror subscription to obrtnik_profiles:', obrtnikError)
    }

    console.log(
      `[WEBHOOK] Subscription updated: user=${profileId}, tier=${tier}, subscription=${stripeSubscriptionId || 'N/A'}`
    )
  },
}
