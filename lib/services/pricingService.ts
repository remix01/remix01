// Pricing Service - Price Estimation & Calculations
import type { Category } from '@/types/marketplace'

export interface PricingRule {
  categoryId: string
  basePrice: number
  pricePerHour: number
  minimumPrice: number
  maximumPrice: number
}

// Default pricing rules (can be extended with database)
const defaultPricingRules: Record<string, PricingRule> = {
  'vodovodna-dela': {
    categoryId: 'vodovodna-dela',
    basePrice: 50,
    pricePerHour: 40,
    minimumPrice: 50,
    maximumPrice: 500,
  },
  'elektricna-dela': {
    categoryId: 'elektricna-dela',
    basePrice: 60,
    pricePerHour: 50,
    minimumPrice: 60,
    maximumPrice: 600,
  },
  'tesarstvo': {
    categoryId: 'tesarstvo',
    basePrice: 40,
    pricePerHour: 35,
    minimumPrice: 40,
    maximumPrice: 400,
  },
}

export enum JobSize {
  SMALL = 'small',   // 1-3 hours
  MEDIUM = 'medium', // 3-8 hours
  LARGE = 'large',   // 8+ hours
}

const jobSizeHours: Record<JobSize, [number, number]> = {
  [JobSize.SMALL]: [1, 3],
  [JobSize.MEDIUM]: [3, 8],
  [JobSize.LARGE]: [8, 24],
}

/**
 * Estimate price for a job
 */
export function estimateJobPrice(
  categorySlug: string,
  jobSize: JobSize,
  urgency: 'normalno' | 'kmalu' | 'nujno' = 'normalno'
): { min: number; max: number } {
  const rule = defaultPricingRules[categorySlug]
  if (!rule) {
    // Fallback for unknown categories
    return { min: 50, max: 200 }
  }

  const [minHours, maxHours] = jobSizeHours[jobSize]

  // Calculate base estimates
  let minPrice = rule.basePrice + minHours * rule.pricePerHour
  let maxPrice = rule.basePrice + maxHours * rule.pricePerHour

  // Apply urgency multiplier
  const urgencyMultiplier = {
    'normalno': 1.0,
    'kmalu': 1.2,
    'nujno': 1.5,
  }[urgency]

  minPrice *= urgencyMultiplier
  maxPrice *= urgencyMultiplier

  // Apply min/max constraints
  minPrice = Math.max(minPrice, rule.minimumPrice)
  maxPrice = Math.min(maxPrice, rule.maximumPrice)

  return {
    min: Math.round(minPrice),
    max: Math.round(maxPrice),
  }
}

/**
 * Calculate service fee for a transaction
 */
export function calculateServiceFee(jobPrice: number, feePercentage: number = 0.1): number {
  return Math.round(jobPrice * feePercentage)
}

/**
 * Calculate total cost for customer
 */
export function calculateTotalCost(
  jobPrice: number,
  serviceFeePct: number = 0.1
): { jobPrice: number; serviceFee: number; total: number } {
  const serviceFee = calculateServiceFee(jobPrice, serviceFeePct)
  return {
    jobPrice,
    serviceFee,
    total: jobPrice + serviceFee,
  }
}

/**
 * Get price range for display
 */
export function formatPriceRange(min: number, max: number): string {
  if (min === max) {
    return `${min} €`
  }
  return `${min} - ${max} €`
}

/**
 * Validate price is within acceptable range
 */
export function validatePrice(price: number, min: number, max: number): boolean {
  return price >= min && price <= max
}
