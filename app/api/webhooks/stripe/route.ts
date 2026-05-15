import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe'
import { assertEnv } from '@/lib/env'
import { fail, ok } from '@/lib/http/response'
import { stripeWebhookHandlers } from '@/lib/stripe/handlers'
import { claimStripeEventProcessing, releaseStripeEventClaim } from '@/lib/stripe/eventProcessing'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  assertEnv()

  const rawBody = Buffer.from(await request.arrayBuffer())
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return fail('Manjka stripe-signature')
  }

  let event: Stripe.Event
  try {
    event = constructStripeEvent(rawBody, sig)
  } catch (err) {
    console.error('[WEBHOOK] Signature fail:', err)
    return fail('Neveljaven podpis')
  }

  const acceptedTypes = new Set(Object.keys(stripeWebhookHandlers))
  if (!acceptedTypes.has(event.type)) {
    console.info('[WEBHOOK] Ignoring unsupported Stripe event type', {
      stripeEventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    })
    return ok({ received: true, ignored: true })
  }

  const claimed = await claimStripeEventProcessing(event.id, event.type)
  if (!claimed) {
    console.info('[WEBHOOK] Duplicate Stripe event skipped', { stripeEventId: event.id, eventType: event.type })
    return ok({ received: true, skipped: true })
  }

  try {
    const handler = stripeWebhookHandlers[event.type]
    await handler(event)

    console.info('[WEBHOOK] Stripe event processed', {
      stripeEventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    })


    return ok({ received: true })
  } catch (err) {
    console.error('[WEBHOOK PROCESS]', err)
    try {
      await releaseStripeEventClaim(event.id)
    } catch (releaseErr) {
      console.error('[WEBHOOK] Failed to release idempotency claim after processing error', {
        stripeEventId: event.id,
        releaseErr,
      })
      throw releaseErr
    }
    return fail('Processing error')
  }
}
