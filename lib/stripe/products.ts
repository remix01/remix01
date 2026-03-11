/**
 * Stripe Products Configuration
 * 
 * Definira vse Stripe produkte in cene za LiftGO platform.
 * Posodobljeno: 11.3.2026
 */

export const STRIPE_PRODUCTS = {
  START: {
    productId: 'prod_U7z9Ymkbh2zRAW',
    priceId: 'price_1T9jBPKWYyYULHZkR4J6NyK1',
    name: 'LiftGo START',
    slug: 'start',
    price: 0,
    currency: 'EUR',
    interval: 'month' as const,
    commission: 10, // 10% provizija
    features: [
      'Neomejene ponudbe',
      '10% provizija na posle',
      'Osnovna podpora',
      'Profil v katalogu',
    ],
  },
  PRO: {
    productId: 'prod_SpS7ixowByASns',
    priceId: 'price_1RuAtoKWYyYULHZkiI9eg1Eq',
    name: 'LiftGo PRO',
    slug: 'pro',
    price: 29,
    currency: 'EUR',
    interval: 'month' as const,
    commission: 5, // 5% provizija
    features: [
      'Vse iz START paketa',
      '5% provizija na posle',
      'Prednostna podpora',
      'Napredna analitika',
      'Izpostavljeni profil',
      'Zgodnje obvestilo o povpraševanjih',
    ],
  },
} as const;

export type SubscriptionTier = 'start' | 'pro';

/**
 * Vrne konfiguracijo za določen plan
 */
export function getProductConfig(tier: SubscriptionTier) {
  return tier === 'start' ? STRIPE_PRODUCTS.START : STRIPE_PRODUCTS.PRO;
}

/**
 * Vrne stopnjo provizije za določen plan (v odstotkih)
 */
export function getCommissionRate(tier: SubscriptionTier): number {
  const config = getProductConfig(tier);
  return config.commission;
}

/**
 * Vrne Stripe Price ID za določen plan
 */
export function getPriceId(tier: SubscriptionTier): string {
  const config = getProductConfig(tier);
  return config.priceId;
}

/**
 * Ugotovi tip plana iz Stripe Price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === STRIPE_PRODUCTS.START.priceId) return 'start';
  if (priceId === STRIPE_PRODUCTS.PRO.priceId) return 'pro';
  return null;
}

/**
 * Seznam vseh aktivnih price ID-jev
 */
export const ACTIVE_PRICE_IDS = [
  STRIPE_PRODUCTS.START.priceId,
  STRIPE_PRODUCTS.PRO.priceId,
] as const;

/**
 * Preveri če je price ID veljaven
 */
export function isValidPriceId(priceId: string): boolean {
  return ACTIVE_PRICE_IDS.includes(priceId as any);
}