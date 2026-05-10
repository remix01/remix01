/**
 * Canonical plan/tier configuration for LiftGO partner subscriptions.
 * Prices and commissions are sourced from lib/stripe/config.ts to avoid divergence.
 * All tier-gating logic should reference this file.
 */
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'

export type PartnerTier = 'start' | 'pro' | 'elite'

export interface PlanFeatures {
  crm: boolean
  insights: boolean
  offerGenerator: boolean
  exclusiveLeads: boolean
}

export interface PlanConfig {
  tier: PartnerTier
  label: string
  price: number
  commission: number
  aiMessagesPerDay: number
  features: PlanFeatures
}

export const PLANS: Record<PartnerTier, PlanConfig> = {
  start: {
    tier: 'start',
    label: 'START',
    price: STRIPE_PRODUCTS.START.price,
    commission: STRIPE_PRODUCTS.START.commission,
    aiMessagesPerDay: 5,
    features: { crm: false, insights: false, offerGenerator: false, exclusiveLeads: false },
  },
  pro: {
    tier: 'pro',
    label: 'PRO',
    price: STRIPE_PRODUCTS.PRO.price,
    commission: STRIPE_PRODUCTS.PRO.commission,
    aiMessagesPerDay: 100,
    features: { crm: true, insights: true, offerGenerator: true, exclusiveLeads: false },
  },
  elite: {
    tier: 'elite',
    label: 'ELITE',
    // NOTE: STRIPE_PRODUCTS.ELITE.commission is 3% (backend source of truth).
    // UI historically showed 0% — use this value as canonical.
    price: STRIPE_PRODUCTS.ELITE.price,
    commission: STRIPE_PRODUCTS.ELITE.commission,
    aiMessagesPerDay: Infinity,
    features: { crm: true, insights: true, offerGenerator: true, exclusiveLeads: true },
  },
}

export function normalizeTier(raw: string | null | undefined): PartnerTier {
  if (raw === 'elite') return 'elite'
  if (raw === 'pro') return 'pro'
  return 'start'
}

export function tierHasFeature(tier: PartnerTier, feature: keyof PlanFeatures): boolean {
  return PLANS[tier]?.features[feature] ?? false
}
