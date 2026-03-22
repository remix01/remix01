/**
 * Stripe Helper Functions
 * Commission calculations and plan utilities
 */

import { STRIPE_PRODUCTS, type PlanType } from './config'

/**
 * Get commission rate (as percentage) for a subscription plan
 * @param planType - 'START' | 'PRO'
 * @returns Commission rate as a percentage (e.g., 10 for 10%)
 */
export function getCommissionRate(planType: PlanType): number {
  return STRIPE_PRODUCTS[planType].commission
}

/**
 * Get commission rate as decimal (0.10 = 10%)
 * @param planType - 'START' | 'PRO'
 * @returns Commission rate as decimal (e.g., 0.10 for 10%)
 */
export function getCommissionRateDecimal(planType: PlanType): number {
  return STRIPE_PRODUCTS[planType].commission / 100
}

/**
 * Calculate commission from amount in cents
 * @param amountCents - Amount in cents
 * @param planType - 'START' | 'PRO'
 * @returns Commission amount in cents
 */
export function calculateCommission(amountCents: number, planType: PlanType): number {
  const rate = getCommissionRateDecimal(planType)
  return Math.round(amountCents * rate)
}

/**
 * Calculate payout amount after commission
 * @param amountCents - Total amount in cents
 * @param planType - 'START' | 'PRO'
 * @returns Payout amount in cents (amount - commission)
 */
export function calculatePayout(amountCents: number, planType: PlanType): number {
  const commission = calculateCommission(amountCents, planType)
  return amountCents - commission
}

/**
 * Get plan monthly price in cents
 * @param planType - 'START' | 'PRO'
 * @returns Price in cents (e.g., 2900 for €29.00)
 */
export function getPlanPriceInCents(planType: PlanType): number {
  return STRIPE_PRODUCTS[planType].price * 100
}

/**
 * Get plan monthly price in euros
 * @param planType - 'START' | 'PRO'
 * @returns Price in euros
 */
export function getPlanPrice(planType: PlanType): number {
  return STRIPE_PRODUCTS[planType].price
}

/**
 * Get plan name
 * @param planType - 'START' | 'PRO'
 * @returns Plan display name
 */
export function getPlanName(planType: PlanType): string {
  return STRIPE_PRODUCTS[planType].name
}

/**
 * Get plan features
 * @param planType - 'START' | 'PRO'
 * @returns Array of feature descriptions
 */
export function getPlanFeatures(planType: PlanType): string[] {
  return [...STRIPE_PRODUCTS[planType].features] as string[]
}

/**
 * Format price for display
 * @param euros - Price in euros
 * @returns Formatted price string (e.g., "€29,00")
 */
export function formatPrice(euros: number): string {
  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)
}

/**
 * Get plan from subscription metadata
 * Safely extract plan type from Stripe subscription or customer metadata
 */
export function getPlanFromMetadata(metadata?: Record<string, string> | null): PlanType {
  if (!metadata) return 'START'
  const plan = metadata.plan || metadata.subscription_plan
  return (plan === 'PRO' ? 'PRO' : 'START') as PlanType
}
