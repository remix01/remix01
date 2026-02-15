import type { CraftworkerProfile, PackageType } from '@prisma/client'

export interface CommissionResult {
  rate: number // Final commission rate percentage (e.g., 6.5)
  tierName: string // e.g., "START - Tier 2"
  nextTierAt: number | null // Number of jobs to reach next tier, or null if at max
  savingsVsStandard: number // Savings compared to base rate
  breakdown: {
    baseRate: number
    tierDiscount: number
    loyaltyBonus: number
  }
}

interface TierConfig {
  jobs: number
  rate: number
  name: string
}

const START_TIERS: TierConfig[] = [
  { jobs: 0, rate: 10, name: 'START - Osnovna' },
  { jobs: 10, rate: 8, name: 'START - Tier 2' },
  { jobs: 25, rate: 6, name: 'START - Tier 3' },
  { jobs: 50, rate: 4, name: 'START - Elite' }
]

const PRO_TIERS: TierConfig[] = [
  { jobs: 0, rate: 5, name: 'PRO - Osnovna' },
  { jobs: 10, rate: 4, name: 'PRO - Tier 2' },
  { jobs: 25, rate: 3, name: 'PRO - Tier 3' },
  { jobs: 50, rate: 2, name: 'PRO - Elite' }
]

/**
 * Calculate the effective commission rate for a craftworker based on:
 * - Package type (START vs PRO)
 * - Total completed jobs (tiered discounts)
 * - Loyalty points (referral bonuses)
 * - Manual admin override (if set)
 */
export function getEffectiveCommission(
  profile: Pick<CraftworkerProfile, 'packageType' | 'totalJobsCompleted' | 'loyaltyPoints' | 'commissionOverride'>
): CommissionResult {
  // Check for admin override first
  if (profile.commissionOverride) {
    const overrideRate = Number(profile.commissionOverride)
    return {
      rate: overrideRate,
      tierName: 'Admin Override',
      nextTierAt: null,
      savingsVsStandard: 0,
      breakdown: {
        baseRate: overrideRate,
        tierDiscount: 0,
        loyaltyBonus: 0
      }
    }
  }

  const tiers = profile.packageType === 'PRO' ? PRO_TIERS : START_TIERS
  const standardRate = profile.packageType === 'PRO' ? 5 : 10

  // Find current tier based on totalJobsCompleted
  let currentTier = tiers[0]
  let nextTier: TierConfig | null = null

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (profile.totalJobsCompleted >= tiers[i].jobs) {
      currentTier = tiers[i]
      nextTier = i < tiers.length - 1 ? tiers[i + 1] : null
      break
    }
  }

  let baseRate = currentTier.rate
  const tierDiscount = standardRate - baseRate

  // Apply loyalty points bonus: 100 points = -0.5%
  // Minimum rate is 2% (safety floor)
  const loyaltyBonus = profile.loyaltyPoints > 0 ? (profile.loyaltyPoints / 100) * 0.5 : 0
  let finalRate = Math.max(2, baseRate - loyaltyBonus)

  // Calculate next tier threshold
  const nextTierAt = nextTier ? nextTier.jobs - profile.totalJobsCompleted : null

  return {
    rate: Number(finalRate.toFixed(2)),
    tierName: currentTier.name,
    nextTierAt,
    savingsVsStandard: Number((standardRate - finalRate).toFixed(2)),
    breakdown: {
      baseRate,
      tierDiscount,
      loyaltyBonus: Number(loyaltyBonus.toFixed(2))
    }
  }
}

/**
 * Helper to generate a readable explanation of the commission calculation
 */
export function getCommissionExplanation(result: CommissionResult): string {
  const parts: string[] = []

  parts.push(`Vaša trenutna provizija je ${result.rate}%`)

  if (result.breakdown.tierDiscount > 0) {
    parts.push(`vključno s ${result.breakdown.tierDiscount}% popustom za tier`)
  }

  if (result.breakdown.loyaltyBonus > 0) {
    parts.push(`in ${result.breakdown.loyaltyBonus}% bonusom za zvestobo`)
  }

  if (result.nextTierAt && result.nextTierAt > 0) {
    parts.push(`Še ${result.nextTierAt} opravljenih del do naslednjega tiera!`)
  } else if (result.nextTierAt === null) {
    parts.push(`Dosegli ste najvišji tier! 🎉`)
  }

  return parts.join('. ')
}
