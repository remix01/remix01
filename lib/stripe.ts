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
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  }
  return _stripeClient
}

export const stripe = {
  paymentIntents: {
    create: (...args: any[]) => getStripeClient().paymentIntents.create(...args),
    retrieve: (...args: any[]) => getStripeClient().paymentIntents.retrieve(...args),
    cancel: (...args: any[]) => getStripeClient().paymentIntents.cancel(...args),
    capture: (...args: any[]) => getStripeClient().paymentIntents.capture(...args),
    update: (...args: any[]) => getStripeClient().paymentIntents.update(...args),
  },
  refunds: {
    create: (...args: any[]) => getStripeClient().refunds.create(...args),
  },
  webhooks: {
    constructEvent: (payload: string | Buffer, sig: string, secret: string) =>
      getStripeClient().webhooks.constructEvent(payload, sig, secret),
  },
} as Stripe

export const PLATFORM_FEE_PERCENT = {
  start: 10,
  pro: 5,
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

/** Preveri Stripe webhook podpis — brez tega ne zaupaj nobenemu webhoku */
export function constructStripeEvent(
  payload: string | Buffer,
  sig: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    sig,
    env.STRIPE_WEBHOOK_SECRET
  )
}
