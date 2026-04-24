import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe'
import { assertEnv, env } from '@/lib/env'
import { fail, ok } from '@/lib/http/response'
import { isStripeEventProcessed } from '@/lib/escrow'
import { stripeWebhookHandlers } from '@/lib/stripe/handlers'
import { WebhookSecretMissingError } from '@/lib/stripe/webhooks'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  assertEnv()

  const hasAnySecret =
    !!env.STRIPE_WEBHOOK_SECRET ||
    !!env.STRIPE_CONNECT_WEBHOOK_SECRET ||
    !!env.STRIPE_WEBHOOK_SECRETS

  if (!hasAnySecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured — set it in Vercel environment variables')
    return fail('Webhook not configured', 500)
  }

  const rawBody = Buffer.from(await request.arrayBuffer())
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.warn('[WEBHOOK] Missing stripe-signature header')
    return fail('Manjka stripe-signature')
  }

  let event: Stripe.Event
  try {
    event = constructStripeEvent(rawBody, sig)
  } catch (err) {
    if (err instanceof WebhookSecretMissingError) {
      console.error('[WEBHOOK] No signing secret configured:', err.message)
      return fail('Webhook not configured', 500)
    }
    console.error('[WEBHOOK] Signature verification failed — check that STRIPE_WEBHOOK_SECRET matches the Stripe dashboard endpoint secret:', err)
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
