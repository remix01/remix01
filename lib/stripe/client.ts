import Stripe from 'stripe'
import { assertEnv, env } from '@/lib/env'

let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (!stripeClient) {
    assertEnv()
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover' as any,
      typescript: true,
    })
  }

  return stripeClient
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
