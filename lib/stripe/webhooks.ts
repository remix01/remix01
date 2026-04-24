import Stripe from 'stripe'
import { env } from '@/lib/env'
import { stripe } from './client'

function allConfiguredSecrets(): string[] {
  return [
    env.STRIPE_V2_WEBHOOK_SECRET,
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_CONNECT_WEBHOOK_SECRET,
    ...env.STRIPE_WEBHOOK_SECRETS.split(','),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
}

export function constructStripeEvent(
  payload: string | Buffer,
  sig: string
): Stripe.Event {
  const secrets = allConfiguredSecrets()

  let lastError: unknown = new Error('[Stripe] No webhook signing secret configured')

  for (const secret of Array.from(new Set(secrets))) {
    try {
      return stripe.webhooks.constructEvent(payload, sig, secret)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

/**
 * Verify a Stripe v2 thin event (from an Event Destination).
 * These events have `"object": "v2.core.event"` but use the same
 * HMAC-SHA256 signing algorithm as v1 — only the secret differs.
 * STRIPE_V2_WEBHOOK_SECRET must be set to the Event Destination signing secret.
 */
export function constructStripeV2Event(
  payload: Buffer,
  sig: string
): Stripe.Event {
  return constructStripeEvent(payload, sig)
}

export function isStripeV2EventPayload(rawBody: string): boolean {
  try {
    const parsed = JSON.parse(rawBody)
    return parsed?.object === 'v2.core.event'
  } catch {
    return false
  }
}
