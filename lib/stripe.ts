import Stripe from 'stripe'
import { env } from './env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

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
