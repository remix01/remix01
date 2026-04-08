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
    maxCommission: 500, // 500 EUR cap
    features: [
      'Neomejene ponudbe',
      '10% provizija (max 500 EUR na posel)',
      'Osnovna podpora',
      'Dostop do povpraševanj'
    ]
  },
  PRO: {
    productId: 'prod_SpS7ixowByASns',
    priceId: 'price_1RuAtoKWYyYULHZkiI9eg1Eq',
    name: 'LiftGo PRO',
    price: 29,
    commission: 5, // 5% provizija
    maxCommission: 500, // 500 EUR cap
    features: [
      'Neomejene ponudbe',
      '5% provizija (max 500 EUR na posel)',
      'Prednostna podpora',
      'Analitika in statistika',
      'CRM orodje',
      'Generator ponudb',
      'Prioritetna vidnost'
    ]
  },
  ELITE: {
    // TODO: set real Stripe IDs after creating ELITE product/price in Stripe Dashboard
    productId: 'prod_ELITE_TODO',
    priceId: '',
    name: 'LiftGo ELITE',
    price: 79,
    commission: 0,
    maxCommission: null as number | null,
    features: [
      'Vse iz PRO paketa',
      '0% provizija',
      'Top pozicija',
      'Ekskluzivni lead-i',
      'Priority concierge podpora'
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
  return plan === 'START' || plan === 'PRO' || plan === 'ELITE'
}
