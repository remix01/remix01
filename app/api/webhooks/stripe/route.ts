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

// KRITIČNO: onemogoči body parser — Stripe zahteva raw body za podpis
export const maxDuration = 30

// Helper: določi tier iz Stripe price ID (zanesljivo, ne iz metadata)
function tierFromPriceId(priceId: string): 'pro' | 'plus' | 'start' {
  if (priceId === STRIPE_PRODUCTS.PRO.priceId) return 'pro'
  if (priceId === STRIPE_PRODUCTS.PLUS.priceId) return 'plus'
  return 'start'
}

// Helper: dual-write subscription tier v obe tabeli atomarno
async function updateSubscriptionTier(
  userId: string | null,
  customerId: string,
  tier: 'pro' | 'plus' | 'start',
  stripeSubscriptionId?: string
) {
  // Lookup user: najprej po client_reference_id (userId), nato po stripe_customer_id
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

  // Zapiši stripe_customer_id in subscription_tier v profiles
  await supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      subscription_tier: tier,
    })
    .eq('id', profileId)

  // Dual-write v obrtnik_profiles
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
  // 1. PREBERI RAW BODY
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Manjka stripe-signature' }, { status: 400 })
  }

  // 2. PREVERI PODPIS — brez tega zavrni
  let event: Stripe.Event
  try {
    event = constructStripeEvent(rawBody, sig)
  } catch (err) {
    console.error('[WEBHOOK] Signature fail:', err)
    return NextResponse.json({ error: 'Neveljaven podpis' }, { status: 400 })
  }

  // 3. IDEMPOTENTNOST — preskoči že obdelane evente
  if (await isStripeEventProcessed(event.id)) {
    console.log('[WEBHOOK] Event že obdelan:', event.id)
    return NextResponse.json({ received: true, skipped: true })
  }

  // 4. OBDELAJ GLEDE NA TIP EVENTA
  try {
    switch (event.type) {

      // ── Checkout dokončan (prvi nakup) ────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.client_reference_id
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!customerId) break

        // Determine tier from subscription price ID (not hardcoded)
        let tier: 'pro' | 'plus' | 'start' = 'pro'
        if (subscriptionId) {
          try {
            const sub = await (await import('@/lib/stripe')).stripe.subscriptions.retrieve(subscriptionId)
            tier = tierFromPriceId(sub.items.data[0]?.price.id ?? '')
          } catch {
            // fallback to 'pro' — checkout only reached for paid plans
          }
        }
        await updateSubscriptionTier(userId, customerId, tier, subscriptionId)
        break
      }

      // ── Plačilo uspešno (stranka je plačala, sredstva zadržana) ────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const escrow = await getEscrowByPaymentIntent(pi.id)

        await updateEscrowStatus({
          transactionId: escrow.id,
          newStatus:     'paid',
          actor:         'system',
          actorId:       'stripe-webhook',
          stripeEventId: event.id,
          extraFields:   { paid_at: new Date().toISOString() },
          metadata:      { stripeEventType: event.type, piStatus: pi.status },
        })
        break
      }

      // ── Plačilo ni uspelo
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        try {
          const escrow = await getEscrowByPaymentIntent(pi.id)
          await updateEscrowStatus({
            transactionId: escrow.id,
            newStatus:     'cancelled',
            actor:         'system',
            actorId:       'stripe-webhook',
            stripeEventId: event.id,
            metadata: {
              failureCode:    pi.last_payment_error?.code,
              failureMessage: pi.last_payment_error?.message,
            },
          })
        } catch {
          // PI morda ni bil shranjen — logiraj samo
          console.warn('[WEBHOOK] payment_failed: PI ni v DB', pi.id)
        }
        break
      }

      // ── Transfer ustvarjen (izplačilo obrtniku)
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
            transactionId:  escrow.id,
            eventType:      'released',
            actor:          'system',
            actorId:        'stripe-webhook',
            stripeEventId:  event.id,
            statusBefore:   'paid',
            statusAfter:    'released',
            amountCents:    transfer.amount,
            metadata:       { transferId: transfer.id },
          })
        }
        break
      }

      // ── Vračilo (refund)
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
            newStatus:     'refunded',
            actor:         'system',
            actorId:       'stripe-webhook',
            stripeEventId: event.id,
            extraFields:   { refunded_at: new Date().toISOString() },
            metadata:      { refundAmount: charge.amount_refunded },
          })
        } catch {
          console.warn('[WEBHOOK] charge.refunded: ni v DB', piId)
        }
        break
      }

      // ── Naročnina posodobljena — price ID lookup namesto metadata.plan
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.status !== 'active') break
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)
        await updateSubscriptionTier(null, customerId, tier, subscription.id)
        break
      }

      // ── Naročnina začela
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.status !== 'active') break
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = tierFromPriceId(priceId)
        // user_id iz subscription metadata (backup za client_reference_id)
        const userId = subscription.metadata?.user_id ?? null
        await updateSubscriptionTier(userId, customerId, tier, subscription.id)
        break
      }

      // ── Naročnina razveljavljena/preklicana
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await updateSubscriptionTier(null, customerId, 'start', subscription.id)
        break
      }

      default:
        // Neuporabljeni eventi — logiraj samo
        console.log('[WEBHOOK] Unhandled event:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[WEBHOOK PROCESS]', err)
    // Vrni 200 da Stripe ne ponavlja — napako smo logirali
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
