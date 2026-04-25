import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe'
import { assertEnv } from '@/lib/env'
import { fail, ok } from '@/lib/http/response'
import { isStripeEventProcessed } from '@/lib/escrow'
import { stripeWebhookHandlers } from '@/lib/stripe/handlers'

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

  if (await isStripeEventProcessed(event.id)) {
    return ok({ received: true, skipped: true })
  }

  try {
    const handler = stripeWebhookHandlers[event.type]

    if (handler) {
      await handler(event)
    } else {
      console.log('[WEBHOOK] Unhandled event:', event.type)
    }

    return ok({ received: true })
  } catch (err) {
    console.error('[WEBHOOK PROCESS]', err)
    return fail('Processing error')
  }
}
