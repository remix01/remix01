import Stripe from 'stripe'
import { env } from '@/lib/env'
import { stripe } from './client'
import { getStripeInstance } from './client'

export function constructStripeEvent(
  payload: string | Buffer,
  sig: string
): Stripe.Event {
  const configuredSecrets = [
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_CONNECT_WEBHOOK_SECRET,
    ...env.STRIPE_WEBHOOK_SECRETS.split(','),
  ]
    .map((secret) => secret.trim())
    .filter(Boolean)

  let lastError: unknown = new Error('[Stripe] No webhook signing secret configured')

  for (const secret of Array.from(new Set(configuredSecrets))) {
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
 * These events have `"object": "v2.core.event"` and require the
 * full headers object plus a separate signing secret.
 */
export function constructStripeV2Event(
  rawBody: string,
  headers: Record<string, string>
): unknown {
  const configuredSecrets = [
    env.STRIPE_V2_WEBHOOK_SECRET,
    env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ]
    .map((s) => s.trim())
    .filter(Boolean)

  if (configuredSecrets.length === 0) {
    throw new Error('[Stripe] No v2 webhook signing secret configured (set STRIPE_V2_WEBHOOK_SECRET)')
  }

  let lastError: unknown = new Error('[Stripe] No v2 webhook signing secret matched')

  for (const secret of Array.from(new Set(configuredSecrets))) {
    try {
      return (getStripeInstance() as any).v2.webhooks.constructEvent(rawBody, headers, secret)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

export function isStripeV2EventPayload(rawBody: string): boolean {
  try {
    const parsed = JSON.parse(rawBody)
    return parsed?.object === 'v2.core.event'
  } catch {
    return false
  }
}
