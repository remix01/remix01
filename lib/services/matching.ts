// Service - Partner Matching
import { getTopRatedObrtnikiByCategory, getNearbyObrtnikiByCity } from '@/lib/dal/partners'
import type { ObrtnikProfile, Povprasevanje } from '@/types/marketplace'
import type { ScoringCandidate, ScoringInput, ScoringReason, ScoringResult } from './matchingScoringContract'
import { buildScoringAudit } from './matchingScoringContract'

/**
 * Find instant matches (top partners) for a povprasevanje
 * Considers rating, location, availability, and category
 */
export async function findInstantMatches(
  povprasevanje: Povprasevanje,
  limit: number = 5
): Promise<ObrtnikProfile[]> {
  try {
    // Get top-rated partners in the category
    const categoryPartners = await getTopRatedObrtnikiByCategory(
      povprasevanje.category_id,
      limit * 2 // Get more than needed, then filter
    )

    // Filter by location and availability
    let filtered = categoryPartners.filter(
      (p) =>
        p.is_available &&
        p.profile?.location_city === povprasevanje.location_city
    )

    // If we don't have enough in the same city, include nearby cities
    if (filtered.length < limit) {
      const nearbyPartners = await getNearbyObrtnikiByCity(
        povprasevanje.location_city,
        limit * 2
      )

      filtered = filtered.concat(
        nearbyPartners.filter(
          (p) =>
            p.is_available &&
            !filtered.some((fp) => fp.id === p.id) // Avoid duplicates
        )
      )
    }

    // Sort by rating and return top N
    return filtered
      .sort((a, b) => b.avg_rating - a.avg_rating)
      .slice(0, limit)
  } catch (error) {
    console.error('[v0] Error finding instant matches:', error)
    return []
  }
}

export function scoreClassicCandidate(input: ScoringInput, candidate: ScoringCandidate): Omit<ScoringResult, 'rank' | 'selected'> {
  let score = 0
  const reasons: ScoringReason[] = []

  const rating = candidate.rating ?? 0
  const ratingPts = Math.min(30, (rating / 5) * 30)
  score += ratingPts
  reasons.push({ code: 'rating', message: `Rating ${rating.toFixed(1)}/5`, impact: Math.round(ratingPts) })

  if (candidate.available) {
    score += 20
    reasons.push({ code: 'availability', message: 'Available now', impact: 20 })
  }

  if (candidate.city && input.locationCity && candidate.city === input.locationCity) {
    score += 25
    reasons.push({ code: 'location_city', message: 'Same city', impact: 25 })
  } else if (candidate.region && input.locationRegion && candidate.region === input.locationRegion) {
    score += 15
    reasons.push({ code: 'location_region', message: 'Same region', impact: 15 })
  }

  if (candidate.categoryIds?.includes(input.categoryId)) {
    score += 25
    reasons.push({ code: 'category', message: 'Category match', impact: 25 })
  }

  return {
    candidateId: candidate.id,
    score: Math.round(score),
    reasons,
    pipelineVersion: 'classic-v1',
  }
}

export function scoreClassicCandidates(input: ScoringInput, candidates: ScoringCandidate[]): ScoringResult[] {
  return candidates
    .map((candidate) => scoreClassicCandidate(input, candidate))
    .sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      selected: index === 0,
    }))
}

/**
 * Calculate match score for a partner-job pair
 * Higher score = better match (0-100)
 * @deprecated use scoreClassicCandidate/scoreClassicCandidates
 */
export function calculateMatchScore(
  obrtnik: ObrtnikProfile,
  povprasevanje: Povprasevanje
): number {
  const result = scoreClassicCandidate(
    {
      requestId: povprasevanje.id,
      categoryId: povprasevanje.category_id,
      locationCity: povprasevanje.location_city,
      locationRegion: povprasevanje.location_region,
    },
    {
      id: obrtnik.id,
      available: obrtnik.is_available,
      city: obrtnik.profile?.location_city,
      region: obrtnik.profile?.location_region,
      categoryIds: obrtnik.categories?.map((c) => c.id),
      rating: obrtnik.avg_rating,
    }
  )

  return result.score
}

/**
 * Rank partners by match quality
 */
export function rankPartnersByMatch(
  partners: ObrtnikProfile[],
  povprasevanje: Povprasevanje
): Array<ObrtnikProfile & { matchScore: number }> {
  const results = scoreClassicCandidates(
    {
      requestId: povprasevanje.id,
      categoryId: povprasevanje.category_id,
      locationCity: povprasevanje.location_city,
      locationRegion: povprasevanje.location_region,
    },
    partners.map((p) => ({
      id: p.id,
      available: p.is_available,
      city: p.profile?.location_city,
      region: p.profile?.location_region,
      categoryIds: p.categories?.map((c) => c.id),
      rating: p.avg_rating,
    }))
  )

  const map = new Map(results.map((r) => [r.candidateId, r.score]))
  const ranked = partners
    .map((p) => ({
      ...p,
      matchScore: map.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)

  const audit = buildScoringAudit(results)
  console.log('[matching:classic:audit]', audit)

  return ranked
}
