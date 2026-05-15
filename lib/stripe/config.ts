import { isProduction } from '@/lib/env'

/**
 * Stripe Product & Pricing Configuration
 * Centralized definitions for LiftGo subscription plans
 */

export const STRIPE_PRODUCTS = {
  START: {
    productId: process.env.STRIPE_START_PRODUCT_ID || process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_START || (isProduction() ? '' : 'prod_U7z9Ymkbh2zRAW'),
    priceId: process.env.STRIPE_START_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_START || (isProduction() ? '' : 'price_1T9jBPKWYyYULHZkR4J6NyK1'),
    name: 'LiftGo START',
    price: 0,
    commission: 10, // 10% provizija
    features: [
      'Neomejene ponudbe',
      '10% provizija',
      'Osnovna podpora',
      'Dostop do povpraševanj'
    ]
  },
  PRO: {
    productId: process.env.STRIPE_PRO_PRODUCT_ID || process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_PRO || (isProduction() ? '' : 'prod_SpS7ixowByASns'),
    priceId: process.env.STRIPE_PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || (isProduction() ? '' : 'price_1RuAtoKWYyYULHZkiI9eg1Eq'),
    name: 'LiftGo PRO',
    price: 29,
    commission: 5, // 5% provizija
    features: [
      'Neomejene ponudbe',
      '5% provizija',
      'Prednostna podpora',
      'Analitika in statistika',
      'CRM orodje',
      'Generator ponudb',
      'Prioritetna vidnost'
    ]
  },
  ELITE: {
    productId: process.env.STRIPE_ELITE_PRODUCT_ID || process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_ELITE || '',
    priceId: process.env.STRIPE_ELITE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ELITE || '',
    name: 'LiftGo ELITE',
    price: 79,
    commission: 3,
    features: [
      'Top pozicija profila',
      'Ekskluzivni lead-i',
      'Prednostna podpora'
    ]
  },
  CUSTOMER_PREMIUM: {
    productId: process.env.STRIPE_CUSTOMER_PREMIUM_PRODUCT_ID || process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_CUSTOMER_PREMIUM || '',
    priceId: process.env.STRIPE_CUSTOMER_PREMIUM_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_CUSTOMER_PREMIUM || '',
    name: 'LiftGo Customer Premium',
    price: 9,
    commission: 0,
    features: [
      'Prioritetne ponudbe obrtnikov',
      'Hitrejši odziv',
      'Prioritetna podpora'
    ]
  }
} as const

export type PlanType = keyof typeof STRIPE_PRODUCTS

/**
 * Get Stripe price ID for a plan type
 */
export function getStripePriceId(plan: PlanType): string {
  return STRIPE_PRODUCTS[plan].priceId
}

/**
 * Get Stripe product ID for a plan type
 */
export function getStripeProductId(plan: PlanType): string {
  return STRIPE_PRODUCTS[plan].productId
}

/**
 * Get plan details by type
 */
export function getPlanDetails(plan: PlanType) {
  return STRIPE_PRODUCTS[plan]
}

/**
 * Validate if a plan type is valid
 */
export function isValidPlan(plan: unknown): plan is PlanType {
  return plan === 'START' || plan === 'PRO' || plan === 'ELITE' || plan === 'CUSTOMER_PREMIUM'
}
