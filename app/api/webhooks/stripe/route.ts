import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent, stripe as stripeProxy } from '@/lib/stripe'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'
import {
  isStripeEventProcessed,
  updateEscrowStatus,
  getEscrowByPaymentIntent,
  writeAuditLog,
} from '@/lib/escrow'

export const maxDuration = 30

// Syncs a connected Stripe account's onboarding/capability status into DB.
// Called whenever Stripe notifies us of account changes via Connect webhooks.
async function syncConnectedAccountStatus(connectedAccountId: string, stripeEventId: string) {
  try {
    const { data: partner } = await supabaseAdmin
      .from('partners')
      .select('id, stripe_account_status')
      .eq('stripe_account_id', connectedAccountId)
      .maybeSingle()

    if (!partner) {
      console.log(`[WEBHOOK] Connect account ${connectedAccountId} not found in partners table`)
      return
    }

    // Fetch current account status directly from Stripe
    // Use same API version as the Connect event destination (2026-02-25.clover)
    const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover' as any,
    })
    const account = await stripeClient.accounts.retrieve(connectedAccountId)

    const newStatus = account.details_submitted
      ? (account.charges_enabled ? 'active' : 'pending')
      : 'incomplete'

    await supabaseAdmin
      .from('partners')
      .update({
        stripe_account_status: newStatus,
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_details_submitted: account.details_submitted ?? false,
        stripe_payouts_enabled: account.payouts_enabled ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', partner.id)

    console.log(
      `[WEBHOOK] Connect account ${connectedAccountId} synced: ${partner.stripe_account_status} → ${newStatus}`
    )
  } catch (err) {
    console.error(`[WEBHOOK] Failed to sync connect account ${connectedAccountId}:`, err)
  }
}

// Določi subscription tier iz Stripe price ID — zanesljivo, ne iz metadata
function tierFromPriceId(priceId: string): 'start' | 'pro' | 'elite' {
  if (priceId === STRIPE_PRODUCTS.PRO.priceId) return 'pro'
  if (priceId === STRIPE_PRODUCTS.ELITE.priceId) return 'elite'
  return 'start'
}

async function resolveTierFromPaymentIntent(
  pi: Stripe.PaymentIntent
): Promise<'start' | 'pro' | 'elite' | null> {
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
      if (priceId) return tierFromPriceId(priceId)
    } catch (error) {
      console.error('[WEBHOOK] Failed to resolve invoice price for payment_intent:', pi.id, error)
    }
  }

  return normalizeTier(pi.metadata?.subscription_tier || pi.metadata?.package_tier)
}

function normalizeTier(rawTier: string | null | undefined): 'start' | 'pro' | 'elite' | null {
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

// Update subscription tier in profiles + obrtnik_profiles for consistency
async function updateSubscriptionTier(
  userId: string | null,
  customerId: string,
  tier: 'start' | 'pro' | 'elite',
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

  console.log(`[WEBHOOK] Subscription updated: user=${profileId}, tier=${tier}, subscription=${stripeSubscriptionId || 'N/A'}`)
}

export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer())
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Manjka stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructStripeEvent(rawBody, sig)
  } catch (err) {
    console.error('[WEBHOOK] Signature fail:', err)
    return NextResponse.json({ error: 'Neveljaven podpis' }, { status: 400 })
  }

  if (await isStripeEventProcessed(event.id)) {
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    switch (event.type) {

      // Začetni nakup — najpomembnejši event
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        const userId = session.client_reference_id
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        if (!customerId) break
        let tier: 'start' | 'pro' | 'elite' = 'start'
        if (subscriptionId) {
          const subscription = await stripeProxy.subscriptions.retrieve(subscriptionId)
          const priceId = subscription.items.data[0]?.price.id ?? ''
          tier = tierFromPriceId(priceId)
        }
        await updateSubscriptionTier(userId, customerId, tier, subscriptionId)
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const paymentTier = await resolveTierFromPaymentIntent(pi)
        const paymentUserId = pi.metadata?.user_id || pi.metadata?.obrtnik_id || null
        const customerId = typeof pi.customer === 'string' ? pi.customer : null

        if (paymentTier && customerId) {
          await updateSubscriptionTier(paymentUserId, customerId, paymentTier)
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
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        try {
          const escrow = await getEscrowByPaymentIntent(pi.id)
          await updateEscrowStatus({
            transactionId: escrow.id,
            newStatus: 'cancelled',
            actor: 'system',
            actorId: 'stripe-webhook',
            stripeEventId: event.id,
            metadata: {
              failureCode: pi.last_payment_error?.code,
              failureMessage: pi.last_payment_error?.message,
            },
          })
        } catch {
          console.warn('[WEBHOOK] payment_failed: PI ni v DB', pi.id)
        }
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        const piId = transfer.metadata?.payment_intent_id
        if (!piId) break
        const escrow = await getEscrowByPaymentIntent(piId)
        const { error } = await supabaseAdmin
          .from('escrow_transactions')
          .update({ stripe_transfer_id: transfer.id })
          .eq('id', escrow.id)
        if (!error) {
          await writeAuditLog({
            transactionId: escrow.id,
            eventType: 'released',
            actor: 'system',
            actorId: 'stripe-webhook',
            stripeEventId: event.id,
            statusBefore: 'paid',
            statusAfter: 'released',
            amountCents: transfer.amount,
            metadata: { transferId: transfer.id },
          })
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id
        if (!piId) break
        try {
          const escrow = await getEscrowByPaymentIntent(piId)
          await updateEscrowStatus({
            transactionId: escrow.id,
            newStatus: 'refunded',
            actor: 'system',
            actorId: 'stripe-webhook',
            stripeEventId: event.id,
            extraFields: { refunded_at: new Date().toISOString() },
            metadata: { refundAmount: charge.amount_refunded },
          })
        } catch {
          console.warn('[WEBHOOK] charge.refunded: ni v DB', piId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.status !== 'active') break
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)
        await updateSubscriptionTier(null, customerId, tier, subscription.id)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.status !== 'active') break
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)
        const userId = subscription.metadata?.user_id ?? null
        await updateSubscriptionTier(userId, customerId, tier, subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await updateSubscriptionTier(null, customerId, 'start', subscription.id)
        break
      }

      // ── Stripe Connect / v2 account events ─────────────────────────────
      // These are sent when a connected craftworker account changes during
      // onboarding (KYC, requirements, capabilities, persons).
      // We re-fetch the account status from Stripe and sync it to DB.

      case 'v2.core.account[requirements].updated' as any:
      case 'v2.core.account[identity].updated' as any:
      case 'v2.core.account[configuration.merchant].capability_status_updated' as any: {
        const v2Event = event as unknown as {
          related_object: { id: string; type: string }
          context: string
        }
        const connectedAccountId = v2Event.related_object?.id
        if (!connectedAccountId) break

        // Sync onboarding status for this connected account
        await syncConnectedAccountStatus(connectedAccountId, event.id)
        break
      }

      case 'v2.core.account_person.created' as any:
      case 'v2.core.account_person.updated' as any: {
        const v2Event = event as unknown as {
          related_object: { id: string; type: string; url: string }
          context: string
        }
        // Extract account ID from the person URL: /v2/core/accounts/{acct_id}/persons/{person_id}
        const urlParts = v2Event.related_object?.url?.split('/') ?? []
        const acctIndex = urlParts.indexOf('accounts')
        const connectedAccountId = acctIndex !== -1 ? urlParts[acctIndex + 1] : null
        if (!connectedAccountId) break

        await syncConnectedAccountStatus(connectedAccountId, event.id)
        break
      }

      default:
        console.log('[WEBHOOK] Unhandled event:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[WEBHOOK PROCESS]', err)
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
