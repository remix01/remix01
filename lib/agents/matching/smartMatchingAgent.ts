import { getErrorMessage } from '@/lib/utils/error'
/**
 * Smart Matching Agent
 * 
 * Implements advanced partner matching algorithm based on:
 * - Location proximity (max 40 points)
 * - Partner rating/quality (max 30 points)
 * - Response rate performance (max 20 points)
 * - Category expertise match (max 10 points)
 * - Subscription tier boost (multiplier: 1.0 START, 1.2 PRO, 1.4 ELITE)
 * 
 * Composite score: 0-100+ for each partner (with boost applied)
 * Returns: Top 5 matches sorted by finalScore DESC
 * Performance: Target < 500ms execution time
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { ObrtnikProfile, Povprasevanje } from '@/types/marketplace'

export interface MatchBreakdown {
  locationScore: number
  ratingScore: number
  responseScore: number
  categoryScore: number
  subscriptionBoost: number
  baseScore: number
}

export interface MatchResult {
  partnerId: string
  partnerName: string
  score: number
  breakdown: MatchBreakdown
  distanceKm: number
  estimatedResponseMinutes: number
  subscriptionTier: string
}

interface MatchingInput {
  lat: number
  lng: number
  categoryId: string
  requestId: string
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in km
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Score location proximity (max 40 points)
 * <5km: 40, <10km: 30, <20km: 20, <50km: 10, else: 0
 */
function scoreLocation(distanceKm: number): number {
  if (distanceKm < 5) return 40
  if (distanceKm < 10) return 30
  if (distanceKm < 20) return 20
  if (distanceKm < 50) return 10
  return 0
}

/**
 * Score partner rating (max 30 points)
 * Converts 0-5 rating scale to 0-30 points
 */
function scoreRating(rating: number): number {
  const normalized = Math.max(0, Math.min(5, rating)) / 5
  return normalized * 30
}

/**
 * Score response performance (max 20 points)
 * Uses response_time_hours: lower response time = higher score
 * Converts to ratio: assume 24h = 0 points, 0h = 20 points
 */
function scoreResponse(responseTimeHours: number | null): number {
  if (!responseTimeHours || responseTimeHours >= 24) return 0
  // Linear: 24h → 0 points, 1h → 19.17 points, 0h → 20 points
  return Math.max(0, 20 - (responseTimeHours / 24) * 20)
}

/**
 * Score category expertise (max 10 points)
 * Exact match: 10 points, no match: 0 points
 */
function scoreCategory(
  partnerCategories: string[],
  requestCategoryId: string
): number {
  return partnerCategories.includes(requestCategoryId) ? 10 : 0
}

/**
 * Calculate subscription tier boost multiplier
 * START (free): 1.0x (no boost)
 * PRO (€29/mo): 1.2x (+20%)
 * ELITE (€79/mo): 1.4x (+40%)
 * enterprise: 1.5x (+50%)
 */
function getSubscriptionBoostMultiplier(tier: string | null): number {
  switch (tier?.toLowerCase()) {
    case 'pro':
      return 1.2
    case 'elite':
      return 1.4
    case 'enterprise':
      return 1.5
    case 'start':
    default:
      return 1.0
  }
}

/**
 * Filter partners by eligibility requirements
 */
function filterEligiblePartners<T extends {
    id: string
    is_verified: boolean
    is_available: boolean
    avg_rating: number
    total_reviews: number
    categories: string[]
    subscription_tier?: string | null
  }>(
  partners: T[],
  categoryId: string
): T[] {
  return partners.filter((p) => {
    // Must be verified
    if (!p.is_verified) return false

    // Must be active
    if (!p.is_available) return false

    // Must have the service category
    if (!p.categories.includes(categoryId)) return false

    // Must have at least 3.0 rating (if they have reviews)
    if (p.total_reviews > 0 && p.avg_rating < 3.0) return false

    return true
  })
}

/**
 * Main matching algorithm
 * Calculates composite score for each eligible partner, with subscription boost applied
 */
export async function matchPartnersForRequest(input: MatchingInput) {
  const startTime = Date.now()

  try {
    const supabase = createAdminClient()

    // 1. Fetch request details
    const { data: povprasevanje, error: povError } = await supabase
      .from('povprasevanja')
      .select('*')
      .eq('id', input.requestId)
      .single()

    if (povError || !povprasevanje) {
      throw new Error('Povpraševanja ni bilo mogoče naložiti')
    }

    // 2. Fetch all eligible partners with their categories AND subscription tier
    const { data: partnersData, error: partnersError } = await supabase
      .from('obrtnik_profiles')
      .select(
        `
        id,
        is_verified,
        is_available,
        avg_rating,
        total_reviews,
        response_time_hours,
        profile:profiles(
          location_city,
          location_region,
          subscription_tier
        ),
        obrtnik_categories!obrtnik_id(
          category_id
        )
      `
      )
      .eq('is_verified', true)
      .eq('is_available', true)

    if (partnersError || !partnersData) {
      throw new Error('Obrtnike ni bilo mogoče naložiti')
    }

    // 3. Transform data and extract categories and subscription tier
    const partnersWithCategories = partnersData.map((p: any) => ({
      id: p.id,
      is_verified: p.is_verified,
      is_available: p.is_available,
      avg_rating: p.avg_rating || 0,
      total_reviews: p.total_reviews || 0,
      response_time_hours: p.response_time_hours || null,
      profile: p.profile,
      subscription_tier: p.profile?.subscription_tier || 'start',
      categories: (p.obrtnik_categories || []).map((c: any) => c.category_id),
    }))

    // 4. Filter eligible partners
    const eligible = filterEligiblePartners(
      partnersWithCategories,
      input.categoryId
    )

    if (eligible.length === 0) {
      return {
        matches: [],
        matchingId: null,
        error: 'Ni primerno ujemanje za to povpraševanje',
      }
    }

    // 5. Calculate scores for each partner
    const scored = eligible
      .map((partner) => {
        // Get partner's location (fallback to city if coords not available)
        const partnerLat = (partner.profile as any)?.lat || null
        const partnerLng = (partner.profile as any)?.lng || null

        // Calculate distance (if coordinates available)
        let distance = 999
        if (partnerLat && partnerLng) {
          distance = calculateDistance(
            input.lat,
            input.lng,
            partnerLat,
            partnerLng
          )
        }

        // Score components (base score: 0-100)
        const locationScore = scoreLocation(distance)
        const ratingScore = scoreRating(partner.avg_rating)
        const responseScore = scoreResponse(partner.response_time_hours)
        const categoryScore = scoreCategory(
          partner.categories,
          input.categoryId
        )

        const baseScore =
          locationScore + ratingScore + responseScore + categoryScore

        // Apply subscription tier boost
        const boostMultiplier = getSubscriptionBoostMultiplier(
          partner.subscription_tier ?? null
        )
        const subscriptionBoost = (boostMultiplier - 1) * baseScore * 100 // Convert to points for logging
        const finalScore = baseScore * boostMultiplier

        return {
          partnerId: partner.id,
          score: Math.round(finalScore * 100) / 100,
          breakdown: {
            locationScore,
            ratingScore,
            responseScore,
            categoryScore,
            subscriptionBoost: Math.round(subscriptionBoost * 100) / 100,
            baseScore: Math.round(baseScore * 100) / 100,
          },
          distanceKm: Math.round(distance * 10) / 10,
          estimatedResponseMinutes: partner.response_time_hours
            ? Math.round(partner.response_time_hours * 60)
            : 120,
          subscriptionTier: partner.subscription_tier ?? 'start',
        }
      })
      .sort((a, b) => b.score - a.score)

    // 6. Get top 5 matches
    const topMatches = scored.slice(0, 5)

    if (topMatches.length === 0) {
      return {
        matches: [],
        matchingId: null,
      }
    }

    // 7. Log results with enhanced details
    const executionTime = Date.now() - startTime
    const { data: logData, error: logError } = await supabase
      .from('matching_logs' as any)
      .insert({
        request_id: input.requestId,
        top_partner_id: topMatches[0].partnerId,
        top_score: topMatches[0].score,
        top_partner_tier: topMatches[0].subscriptionTier,
        all_matches: topMatches,
        algorithm_version: '2.0-subscription-boost',
        execution_time_ms: executionTime,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[v0] Error logging matching results:', logError)
      // Don't fail - still return matches even if logging fails
    }

    // 8. Log subscription boost details
    console.log(
      `[Matching] Request ${input.requestId}: Top match = ${topMatches[0]!.partnerId} (${topMatches[0]!.subscriptionTier.toUpperCase()}) with score ${topMatches[0]!.score} (base: ${topMatches[0]!.breakdown.baseScore}, boost: +${topMatches[0]!.breakdown.subscriptionBoost})`
    )

    return {
      matches: topMatches,
      matchingId: (logData as any)?.id ?? null,
      executionTimeMs: executionTime,
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[v0] Matching algorithm error:', error)
    return {
      matches: [],
      matchingId: null,
      error: error instanceof Error ? error.message : 'Napaka pri iskanju',
      executionTimeMs: executionTime,
    }
  }
}
