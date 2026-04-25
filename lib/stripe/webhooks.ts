import Stripe from 'stripe'
import { env } from '@/lib/env'
import { stripe } from './client'

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
