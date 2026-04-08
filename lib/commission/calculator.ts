export type CommissionTier = 'start' | 'pro' | 'elite'

export interface CommissionCalculationParams {
  grossAmountEur: number
  tier: CommissionTier
  tierConfig?: TierConfig
}

export interface TierConfig {
  tier_name: CommissionTier
  commission_rate: number // 0.10 = 10%
  max_commission_eur: number | null
}

export interface CommissionCalculationResult {
  grossAmountCents: number
  commissionCents: number
  netPayoutCents: number
  commissionRate: number
  capApplied: boolean
  maxCommissionCapCents: number | null
  grossAmountEur: string
  commissionEur: string
  netPayoutEur: string
}

const DEFAULT_TIER_CONFIG: Record<CommissionTier, TierConfig> = {
  start: {
    tier_name: 'start',
    commission_rate: 0.1,
    max_commission_eur: 500,
  },
  pro: {
    tier_name: 'pro',
    commission_rate: 0.05,
    max_commission_eur: 500,
  },
  elite: {
    tier_name: 'elite',
    commission_rate: 0,
    max_commission_eur: null,
  },
}

/**
 * Converts EUR to cents with proper half-up rounding.
 */
export function eurToCents(eur: number): number {
  return Math.round(eur * 100)
}

/**
 * Converts integer cents to a fixed 2-decimal EUR string.
 */
export function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function getDefaultTierConfig(tier: CommissionTier): TierConfig {
  return DEFAULT_TIER_CONFIG[tier]
}

/**
 * Pure commission calculation in integer cents.
 *
 * Rules:
 * - START: 10%, cap 500 EUR
 * - PRO: 5%, cap 500 EUR
 * - ELITE: 0%, no cap
 */
export function calculateCommission(
  params: CommissionCalculationParams
): CommissionCalculationResult {
  const { grossAmountEur, tier, tierConfig } = params

  if (!Number.isFinite(grossAmountEur)) {
    throw new Error('Gross amount must be a finite number')
  }

  if (grossAmountEur < 0) {
    throw new Error('Gross amount cannot be negative')
  }

  const config = tierConfig ?? getDefaultTierConfig(tier)
  const grossAmountCents = eurToCents(grossAmountEur)

  if (grossAmountCents === 0) {
    return {
      grossAmountCents: 0,
      commissionCents: 0,
      netPayoutCents: 0,
      commissionRate: config.commission_rate,
      capApplied: false,
      maxCommissionCapCents:
        config.max_commission_eur === null ? null : eurToCents(config.max_commission_eur),
      grossAmountEur: '0.00',
      commissionEur: '0.00',
      netPayoutEur: '0.00',
    }
  }

  const rawCommissionCents = Math.round(grossAmountCents * config.commission_rate)
  const capCents = config.max_commission_eur === null ? null : eurToCents(config.max_commission_eur)

  const commissionCents = capCents === null
    ? rawCommissionCents
    : Math.min(rawCommissionCents, capCents)

  const capApplied = capCents !== null && rawCommissionCents > capCents
  const netPayoutCents = grossAmountCents - commissionCents

  if (netPayoutCents < 0) {
    throw new Error('Calculated payout cannot be negative')
  }

  if (grossAmountCents !== commissionCents + netPayoutCents) {
    throw new Error(
      `Commission calculation error: ${grossAmountCents} ≠ ${commissionCents} + ${netPayoutCents}`
    )
  }

  return {
    grossAmountCents,
    commissionCents,
    netPayoutCents,
    commissionRate: config.commission_rate,
    capApplied,
    maxCommissionCapCents: capCents,
    grossAmountEur: centsToEur(grossAmountCents),
    commissionEur: centsToEur(commissionCents),
    netPayoutEur: centsToEur(netPayoutCents),
  }
}
