import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe'
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
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
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
function tierFromPriceId(priceId: string): 'pro' | 'start' {
  if (priceId === STRIPE_PRODUCTS.PRO.priceId) return 'pro'
  return 'start'
}

// Dual-write subscription tier v profiles + obrtnik_profiles
async function updateSubscriptionTier(
  userId: string | null,
  customerId: string,
  tier: 'pro' | 'start',
  stripeSubscriptionId?: string
) {
  let profileId = userId

  if (!profileId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    profileId = data?.id ?? null
  }

  if (!profileId) {
    console.error('[WEBHOOK] Ne morem najti profila za customerId:', customerId)
    return
  }

  await supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      subscription_tier: tier,
    })
    .eq('id', profileId)

  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({
      stripe_customer_id: customerId,
      subscription_tier: tier,
      ...(stripeSubscriptionId && { stripe_subscription_id: stripeSubscriptionId }),
    })
    .eq('id', profileId)

  console.log(`[WEBHOOK] Subscription tier=${tier} posodobljen za user=${profileId}`)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
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
        await updateSubscriptionTier(userId, customerId, 'pro', subscriptionId)
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
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

      case 'v2.core.account[requirements].updated':
      case 'v2.core.account[identity].updated':
      case 'v2.core.account[configuration.merchant].capability_status_updated': {
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

      case 'v2.core.account_person.created':
      case 'v2.core.account_person.updated': {
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
