// Service - Partner Matching
import { getTopRatedObrtnikiByCategory, getNearbyObrtnikiByCity } from '@/lib/dal/partners'
import type { ObrtnikProfile, Povprasevanje } from '@/types/marketplace'

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

/**
 * Calculate match score for a partner-job pair
 * Higher score = better match (0-100)
 */
export function calculateMatchScore(
  obrtnik: ObrtnikProfile,
  povprasevanje: Povprasevanje
): number {
  let score = 0

  // Rating (0-30 points)
  score += Math.min(30, (obrtnik.avg_rating / 5) * 30)

  // Availability (0-20 points)
  if (obrtnik.is_available) {
    score += 20
  }

  // Location match (0-25 points)
  if (obrtnik.profile?.location_city === povprasevanje.location_city) {
    score += 25
  } else if (obrtnik.profile?.location_region === povprasevanje.location_region) {
    score += 15 // Same region but different city
  }

  // Category match (0-25 points)
  if (
    obrtnik.categories?.some((c) => c.id === povprasevanje.category_id)
  ) {
    score += 25
  }

  return Math.round(score)
}

/**
 * Rank partners by match quality
 */
export function rankPartnersByMatch(
  partners: ObrtnikProfile[],
  povprasevanje: Povprasevanje
): Array<ObrtnikProfile & { matchScore: number }> {
  return partners
    .map((p) => ({
      ...p,
      matchScore: calculateMatchScore(p, povprasevanje),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
}
