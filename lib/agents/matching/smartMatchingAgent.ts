/**
 * Smart Matching Agent — Production v3
 *
 * MATCH SCORE (0–100 base, then subscription multiplier):
 *   25 pts  — Category match (exact)
 *   25 pts  — City proximity (Haversine, hard filter >75km)
 *   20 pts  — Response speed (avg response_time_hours)
 *   20 pts  — Review score (avg_rating 0–5)
 *   10 pts  — Activity status (online/offline/busy)
 *   ×1.0–1.5 — Subscription tier boost multiplier
 *
 * Hard filters (disqualify before scoring):
 *   • Must be verified
 *   • is_available = true, is_busy = false
 *   • Category in obrtnik's categories
 *   • Distance ≤ min(contractor.service_radius_km, MAX_HARD_RADIUS_KM)
 *   • active_lead_count < max_active_leads
 *
 * Returns: top MAX_MATCHES partners, sorted by finalScore DESC
 * Logs:    matching_logs table + console structured log
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { ScoringPipelineVersion, ScoringReason, ScoringResult } from '@/lib/services/matchingScoringContract'
import { buildScoringAudit } from '@/lib/services/matchingScoringContract'

export const MAX_HARD_RADIUS_KM = 75   // never send leads beyond 75km
export const MAX_MATCHES = 5            // top N to notify
export const LEAD_SLA_HOURS = 4        // hours contractor has to respond

export interface MatchBreakdown {
  categoryScore: number       // 0–25
  locationScore: number       // 0–25
  responseScore: number       // 0–20
  ratingScore: number         // 0–20
  activityScore: number       // 0–10
  subscriptionBoost: number   // points added by multiplier
  baseScore: number           // sum before boost
}

export interface MatchResult {
  partnerId: string
  score: number               // final (boosted) score
  breakdown: MatchBreakdown
  distanceKm: number
  estimatedResponseMinutes: number
  subscriptionTier: string
  rank: number
}

interface MatchingInput {
  lat: number
  lng: number
  categoryId: string
  requestId: string
}

// ─── Haversine ───────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Score functions (each returns 0–max) ────────────────────────────────────

function scoreCategory(partnerCategories: string[], requestCategoryId: string): number {
  return partnerCategories.includes(requestCategoryId) ? 25 : 0
}

/**
 * 25 pts max.  Linear within service radius, drops to 0 beyond MAX_HARD_RADIUS_KM.
 * <5km=25  <15km=20  <30km=15  <50km=8  <75km=3  else=0
 */
function scoreLocation(distanceKm: number, serviceRadiusKm: number): number {
  const effectiveMax = Math.min(serviceRadiusKm, MAX_HARD_RADIUS_KM)
  if (distanceKm > effectiveMax) return 0
  if (distanceKm < 5) return 25
  if (distanceKm < 15) return 20
  if (distanceKm < 30) return 15
  if (distanceKm < 50) return 8
  if (distanceKm < 75) return 3
  return 0
}

/**
 * 20 pts max.  Lower response time = higher score.
 * response_time_hours: <1h=20  <4h=15  <8h=10  <24h=5  >=24h=0
 */
function scoreResponse(responseTimeHours: number | null): number {
  if (!responseTimeHours || responseTimeHours >= 24) return 0
  if (responseTimeHours < 1) return 20
  if (responseTimeHours < 4) return 15
  if (responseTimeHours < 8) return 10
  if (responseTimeHours < 24) return 5
  return 0
}

/**
 * 20 pts max.  avg_rating 0–5.
 * <3.0 = disqualified upstream
 * 3.0=0  4.0=10  4.5=15  5.0=20
 */
function scoreRating(avgRating: number): number {
  if (avgRating < 3.0) return 0
  if (avgRating >= 5.0) return 20
  return ((avgRating - 3.0) / 2.0) * 20
}

/**
 * 10 pts max.  Measures real-time availability.
 * online + not busy = 10
 * offline + not busy = 5   (available but not actively online)
 * busy               = 0   (filtered upstream anyway, but included for completeness)
 */
function scoreActivity(isOnline: boolean, isBusy: boolean): number {
  if (isBusy) return 0
  return isOnline ? 10 : 5
}

/**
 * Subscription tier multiplier.
 * START=1.0x  PRO=1.2x  ELITE=1.4x  ENTERPRISE=1.5x
 */
function subscriptionMultiplier(tier: string | null): number {
  switch (tier?.toLowerCase()) {
    case 'pro': return 1.2
    case 'elite': return 1.4
    case 'enterprise': return 1.5
    default: return 1.0
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface PartnerCandidate {
  id: string
  is_online: boolean
  avg_rating: number
  total_reviews: number
  response_time_hours: number | null
  service_radius_km: number
  max_active_leads: number
  active_lead_count: number
  lat: number | null
  lng: number | null
  subscription_tier: string
  categories: string[]
}

interface ScoredPartner {
  partnerId: string
  score: number
  breakdown: MatchBreakdown
  distanceKm: number
  estimatedResponseMinutes: number
  subscriptionTier: string
  scoringResult: ScoringResult
}

interface MatchResultInternal extends MatchResult {
  scoringResult: ScoringResult
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function matchPartnersForRequest(input: MatchingInput) {
  const startTime = Date.now()

  try {
    const supabase = createAdminClient()

    // 1. Load request
    const { data: pov, error: povError } = await supabase
      .from('povprasevanja')
      .select('id, title, location_city')
      .eq('id', input.requestId)
      .single()

    if (povError || !pov) throw new Error('Povpraševanje ni bilo mogoče naložiti')

    // 2. Fetch candidates: verified, available, not busy, not over lead cap
    const { data: rawPartners, error: partnersError } = await supabase
      .from('obrtnik_profiles')
      .select(`
        id,
        is_verified,
        is_available,
        is_online,
        is_busy,
        avg_rating,
        total_reviews,
        response_time_hours,
        service_radius_km,
        max_active_leads,
        active_lead_count,
        profile:profiles(
          lat,
          lng,
          location_city,
          subscription_tier
        ),
        obrtnik_categories!obrtnik_id(category_id)
      `)
      .eq('is_verified', true)
      .eq('is_available', true)
      .eq('is_busy', false)

    if (partnersError || !rawPartners) throw new Error('Obrtnike ni bilo mogoče naložiti')

    // 3. Transform
    const partners: PartnerCandidate[] = rawPartners.map((p: any) => ({
      id: p.id as string,
      is_online: p.is_online as boolean,
      avg_rating: (p.avg_rating as number) || 0,
      total_reviews: (p.total_reviews as number) || 0,
      response_time_hours: p.response_time_hours as number | null,
      service_radius_km: (p.service_radius_km as number) || 30,
      max_active_leads: (p.max_active_leads as number) || 3,
      active_lead_count: (p.active_lead_count as number) || 0,
      lat: (p.profile as any)?.lat as number | null,
      lng: (p.profile as any)?.lng as number | null,
      subscription_tier: ((p.profile as any)?.subscription_tier as string) || 'start',
      categories: ((p.obrtnik_categories as any[]) || []).map((c: any) => c.category_id as string),
    }))

    // 4. Hard filters
    const eligible = partners.filter((p) => {
      // Category must match
      if (!p.categories.includes(input.categoryId)) return false
      // Must have minimum rating (if reviewed)
      if (p.total_reviews > 0 && p.avg_rating < 3.0) return false
      // Must not be over active lead cap
      if (p.active_lead_count >= p.max_active_leads) return false
      // Distance hard filter (only if coordinates available)
      if (p.lat && p.lng) {
        const dist = haversineKm(input.lat, input.lng, p.lat, p.lng)
        const radiusLimit = Math.min(p.service_radius_km, MAX_HARD_RADIUS_KM)
        if (dist > radiusLimit) return false
      }
      return true
    })

    if (eligible.length === 0) {
      return { matches: [], matchingId: null, error: 'Ni primernih obrtnikov v dosegu' }
    }

    // 5. Score
    const scored: ScoredPartner[] = eligible
      .map((p: PartnerCandidate) => {
        const distanceKm = p.lat && p.lng
          ? Math.round(haversineKm(input.lat, input.lng, p.lat, p.lng) * 10) / 10
          : 999

        const categoryScore = scoreCategory(p.categories, input.categoryId)
        const locationScore = scoreLocation(distanceKm, p.service_radius_km)
        const responseScore = scoreResponse(p.response_time_hours)
        const ratingScore = Math.round(scoreRating(p.avg_rating) * 10) / 10
        const activityScore = scoreActivity(p.is_online, false)

        const baseScore = categoryScore + locationScore + responseScore + ratingScore + activityScore

        const multiplier = subscriptionMultiplier(p.subscription_tier)
        const finalScore = Math.round(baseScore * multiplier * 100) / 100
        const subscriptionBoost = Math.round((finalScore - baseScore) * 100) / 100

        const reasons: ScoringReason[] = [
          { code: 'category', message: 'Category match', impact: categoryScore },
          { code: 'location', message: `Distance ${distanceKm}km`, impact: locationScore },
          { code: 'response', message: `Response ${p.response_time_hours ?? 24}h`, impact: responseScore },
          { code: 'rating', message: `Rating ${p.avg_rating.toFixed(1)}/5`, impact: ratingScore },
          { code: 'activity', message: p.is_online ? 'Online' : 'Offline', impact: activityScore },
        ]

        const pipelineVersion: ScoringPipelineVersion = 'smart-v3-production'

        return {
          partnerId: p.id,
          score: finalScore,
          breakdown: {
            categoryScore,
            locationScore,
            responseScore,
            ratingScore,
            activityScore,
            subscriptionBoost,
            baseScore,
          },
          distanceKm,
          estimatedResponseMinutes: p.response_time_hours
            ? Math.round(p.response_time_hours * 60)
            : 240,
          subscriptionTier: p.subscription_tier,
          scoringResult: {
            candidateId: p.id,
            score: finalScore,
            rank: 0,
            selected: false,
            reasons,
            pipelineVersion,
          },
        }
      })
      .sort((a: ScoredPartner, b: ScoredPartner) => b.score - a.score)

    // 6. Top MAX_MATCHES
    const topMatchesWithScoring: MatchResultInternal[] = scored
      .slice(0, MAX_MATCHES)
      .map((m: ScoredPartner, i: number) => ({
        ...m,
        rank: i + 1,
        scoringResult: { ...m.scoringResult, rank: i + 1, selected: i === 0 },
      }))

    if (topMatchesWithScoring.length === 0) return { matches: [], matchingId: null }

    const topMatches: MatchResult[] = topMatchesWithScoring.map(({ scoringResult: _scoringResult, ...match }) => match)

    // 7. Log
    const executionTime = Date.now() - startTime
    const { data: logData, error: logError } = await supabase
      .from('matching_logs' as any)
      .insert({
        request_id: input.requestId,
        top_partner_id: topMatchesWithScoring[0].partnerId,
        top_score: topMatchesWithScoring[0].score,
        top_partner_tier: topMatchesWithScoring[0].subscriptionTier,
        all_matches: topMatches,
        algorithm_version: '3.0-production',
        execution_time_ms: executionTime,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[Matching] Log error (non-fatal):', logError.message)
    }

    const scoringAudit = buildScoringAudit(topMatchesWithScoring.map((m) => m.scoringResult))

    console.log(JSON.stringify({
      level: 'info',
      event: 'matching_complete',
      requestId: input.requestId,
      topPartnerId: topMatchesWithScoring[0].partnerId,
      topScore: topMatchesWithScoring[0].score,
      tier: topMatchesWithScoring[0].subscriptionTier,
      candidatesTotal: partners.length,
      eligibleTotal: eligible.length,
      executionMs: executionTime,
      scoringAudit,
    }))

    return {
      matches: topMatches,
      matchingId: (logData as any)?.id || null,
      executionTimeMs: executionTime,
      scoringAudit,
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Matching] Error:', error)
    return {
      matches: [],
      matchingId: null,
      error: error instanceof Error ? error.message : 'Napaka pri iskanju',
      executionTimeMs: executionTime,
    }
  }
}
