import Stripe from 'stripe'
import { env } from './env'

// Lazy-initialize Stripe client only when needed (not at module load)
let _stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (!_stripeClient) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('[Stripe] STRIPE_SECRET_KEY is not configured')
    }
    _stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover' as any,
      typescript: true,
    })
  }
  return _stripeClient
}

export const stripe = {
  paymentIntents: {
    create: (...args: [params: any, options?: any]) => getStripeClient().paymentIntents.create(...args),
    retrieve: (...args: [id: any, params?: any, options?: any]) => getStripeClient().paymentIntents.retrieve(...args),
    cancel: (...args: [id: any, params?: any, options?: any]) => getStripeClient().paymentIntents.cancel(...args),
    capture: (...args: [id: any, params?: any, options?: any]) => getStripeClient().paymentIntents.capture(...args),
    update: (...args: [id: any, params?: any, options?: any]) => getStripeClient().paymentIntents.update(...args),
  },
  checkout: {
    sessions: {
      create: (...args: [params: any, options?: any]) => getStripeClient().checkout.sessions.create(...args),
      retrieve: (...args: [id: any, params?: any, options?: any]) => getStripeClient().checkout.sessions.retrieve(...args),
    },
  },
  billingPortal: {
    sessions: {
      create: (...args: [params: any, options?: any]) => getStripeClient().billingPortal.sessions.create(...args),
    },
  },
  refunds: {
    create: (...args: [params: any, options?: any]) => getStripeClient().refunds.create(...args),
  },
  webhooks: {
    constructEvent: (payload: string | Buffer, sig: string, secret: string) =>
      getStripeClient().webhooks.constructEvent(payload, sig, secret),
  },
} as Stripe

// Commission rates now centralized in lib/stripe/config.ts
// This import ensures consistency across the codebase
import { STRIPE_PRODUCTS } from './stripe/config'

export const PLATFORM_FEE_PERCENT = {
  start: STRIPE_PRODUCTS.START.commission,
  pro: STRIPE_PRODUCTS.PRO.commission,
} as const

export const ESCROW_AUTO_RELEASE_DAYS = 7

/** Izračuna provizijo in izplačilo glede na paket obrtnika */
export function calculateEscrow(
  amountCents: number,
  partnerPaket: 'start' | 'pro'
): {
  commissionRate: number   // npr. 0.10
  commissionCents: number
  payoutCents: number
} {
  const rate = PLATFORM_FEE_PERCENT[partnerPaket] / 100
  const commissionCents = Math.round(amountCents * rate)
  return {
    commissionRate:  rate,
    commissionCents,
    payoutCents: amountCents - commissionCents,
  }
}

/** Preveri Stripe webhook podpis — brez tega ne zaupaj nobenemu webhoku.
 *
 *  Podpira dva tipa webhook endpointov:
 *  - Standardni events  → podpisani z STRIPE_WEBHOOK_SECRET
 *  - Connect v2 eventi  → podpisani z STRIPE_CONNECT_WEBHOOK_SECRET
 *
 *  Strategija: poskusi regular secret; če ne uspe in je konfiguriran
 *  connect secret, poskusi še tega. Meče napako samo če oba odpovesta.
 */
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
