import { PLANS, normalizeTier, tierHasFeature, type PartnerTier, type PlanFeatures } from '@/lib/plans'

export interface AccessDecision {
  allowed: boolean
  tier: PartnerTier
}

export interface QuotaDecision {
  allowed: boolean
  tier: PartnerTier
  used: number
  limit: number | null
  remaining: number | null
}

export function resolvePartnerTier(subscriptionTier: string | null | undefined): PartnerTier {
  return normalizeTier(subscriptionTier)
}

export function canAccessFeature(
  subscriptionTier: string | null | undefined,
  feature: keyof PlanFeatures
): AccessDecision {
  const tier = resolvePartnerTier(subscriptionTier)
  return {
    allowed: tierHasFeature(tier, feature),
    tier,
  }
}

export function getPlanCommission(subscriptionTier: string | null | undefined): number {
  const tier = resolvePartnerTier(subscriptionTier)
  return PLANS[tier].commission
}

export function getDailyAiQuota(subscriptionTier: string | null | undefined): number | null {
  const tier = resolvePartnerTier(subscriptionTier)
  const limit = PLANS[tier].aiMessagesPerDay
  return Number.isFinite(limit) ? limit : null
}

export function evaluateDailyAiQuota(
  subscriptionTier: string | null | undefined,
  usedToday: number
): QuotaDecision {
  const tier = resolvePartnerTier(subscriptionTier)
  const limit = getDailyAiQuota(subscriptionTier)

  if (limit === null) {
    return {
      allowed: true,
      tier,
      used: usedToday,
      limit: null,
      remaining: null,
    }
  }

  return {
    allowed: usedToday < limit,
    tier,
    used: usedToday,
    limit,
    remaining: Math.max(0, limit - usedToday),
  }
}
