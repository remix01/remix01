/**
 * Stripe Product & Pricing Configuration
 * Centralized definitions for LiftGo subscription plans
 */

export const STRIPE_PRODUCTS = {
  START: {
    productId: 'prod_U7z9Ymkbh2zRAW',
    priceId: 'price_1T9jBPKWYyYULHZkR4J6NyK1',
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
  PLUS: {
    // TODO: replace with real Stripe product/price IDs after creating the product in Stripe Dashboard
    productId: 'prod_PLUS_PLACEHOLDER',
    priceId: 'price_PLUS_PLACEHOLDER',
    name: 'LiftGo PLUS',
    price: 19,
    commission: 7, // 7% provizija
    features: [
      'Neomejene ponudbe',
      '7% provizija',
      'Standardna podpora',
      'Osnovna analitika',
      'Izpostavljeni oglas'
    ]
  },
  PRO: {
    productId: 'prod_SpS7ixowByASns',
    priceId: 'price_1RuAtoKWYyYULHZkiI9eg1Eq',
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
  return plan === 'START' || plan === 'PLUS' || plan === 'PRO'
}
