import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  isStripeEventProcessed,
  updateEscrowStatus,
  getEscrowByPaymentIntent,
  writeAuditLog,
} from '@/lib/escrow'

// KRITIČNO: onemogoči body parser — Stripe zahteva raw body za podpis
export const maxDuration = 30

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
