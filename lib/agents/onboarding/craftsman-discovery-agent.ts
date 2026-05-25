/**
 * Craftsman Discovery Agent
 *
 * Scans Google Maps Places API for craftsmen in target cities,
 * scores them with AI, and seeds craftsman_prospects.
 *
 * Triggered by: /api/cron/craftsman-discovery (daily)
 * Also triggered on-demand when supply_demand_signals shows 'supply_needed'.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export interface DiscoveryResult {
  city: string
  countryCode: string
  found: number
  inserted: number
  skipped: number
}

// Map LiftGO categories to Google Maps keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vodovodne_instalacije:   ['plumber', 'vodovodar'],
  elektro_instalacije:     ['electrician', 'elektrikar'],
  ogrevanje_klima:         ['HVAC', 'ogrevanje klima'],
  zidarstvo:               ['mason', 'zidar'],
  krovstvo:                ['roofer', 'krovec'],
  slikarstvo:              ['painter', 'pleskar'],
  tesarstvo_mizarstvo:     ['carpenter', 'mizar'],
  keramičarstvo:           ['tiler', 'keramičar'],
  fasaderstvo:             ['facade contractor', 'fasader'],
  splošna_gradbena_dela:   ['general contractor', 'gradbenik'],
}

interface PlaceResult {
  place_id: string
  name: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  formatted_address?: string
}

async function fetchGoogleMapsPlaces(
  keyword: string,
  city: string,
  countryCode: string,
): Promise<PlaceResult[]> {
  const apiKey = env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('[Discovery] GOOGLE_MAPS_API_KEY not set — returning empty')
    return []
  }

  const query = encodeURIComponent(`${keyword} ${city}`)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}&language=sl&region=${countryCode.toLowerCase()}`

  const res = await fetch(url)
  if (!res.ok) {
    console.error('[Discovery] Google Maps API error', res.status)
    return []
  }

  const data = await res.json() as { status: string; results?: PlaceResult[] }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('[Discovery] Maps API status:', data.status)
    return []
  }

  const places = data.results ?? []

  // Enrich each place with phone + website details
  const enriched: PlaceResult[] = []
  for (const place of places.slice(0, 10)) {
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,rating,user_ratings_total&key=${apiKey}`
    try {
      const detailRes = await fetch(detailUrl)
      if (detailRes.ok) {
        const detail = await detailRes.json() as { result?: Partial<PlaceResult> }
        enriched.push({ ...place, ...detail.result })
        continue
      }
    } catch {
      // fall through
    }
    enriched.push(place)
  }
  return enriched
}

function scoreProspect(place: PlaceResult): number {
  let score = 50

  if ((place.rating ?? 0) >= 4.5) score += 20
  else if ((place.rating ?? 0) >= 4.0) score += 10

  if ((place.user_ratings_total ?? 0) >= 50) score += 15
  else if ((place.user_ratings_total ?? 0) >= 20) score += 8

  if (place.website) score += 10
  if (place.formatted_phone_number) score += 5

  return Math.min(score, 100)
}

export async function discoverCraftsmen(
  city: string,
  countryCode: string,
  categories?: string[],
): Promise<DiscoveryResult> {
  const supabase = createAdminClient()
  const targetCategories = categories ?? Object.keys(CATEGORY_KEYWORDS)

  let totalFound = 0
  let totalInserted = 0
  let totalSkipped = 0

  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('country_code', countryCode)
    .eq('name', city)
    .single()

  for (const category of targetCategories) {
    const keywords = CATEGORY_KEYWORDS[category] ?? [category]

    for (const keyword of keywords.slice(0, 2)) {
      const places = await fetchGoogleMapsPlaces(keyword, city, countryCode)
      totalFound += places.length

      for (const place of places) {
        const { data: existing } = await supabase
          .from('craftsman_prospects')
          .select('id')
          .eq('google_place_id', place.place_id)
          .single()

        if (existing) {
          totalSkipped++
          continue
        }

        const aiScore = scoreProspect(place)

        if (aiScore < 40) {
          totalSkipped++
          continue
        }

        const { error } = await supabase.from('craftsman_prospects').insert({
          country_code:     countryCode,
          location_id:      location?.id ?? null,
          city,
          business_name:    place.name,
          phone:            place.formatted_phone_number ?? null,
          website:          place.website ?? null,
          google_place_id:  place.place_id,
          google_rating:    place.rating ?? null,
          google_reviews:   place.user_ratings_total ?? 0,
          categories:       [category],
          source:           'google_maps',
          status:           'discovered',
          ai_quality_score: aiScore,
          raw_data: {
            address: place.formatted_address,
            keyword,
          },
        })

        if (error) {
          console.error('[Discovery] Insert error', error.message)
          totalSkipped++
        } else {
          totalInserted++
        }
      }
    }
  }

  console.log('[Discovery] Completed', { city, countryCode, totalFound, totalInserted, totalSkipped })
  return { city, countryCode, found: totalFound, inserted: totalInserted, skipped: totalSkipped }
}

export async function runCountryDiscovery(
  countryCode: string,
  limit = 5,
): Promise<DiscoveryResult[]> {
  const supabase = createAdminClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('name')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(limit)

  if (!locations?.length) return []

  const results: DiscoveryResult[] = []
  for (const loc of locations) {
    const result = await discoverCraftsmen(loc.name, countryCode)
    results.push(result)
  }
  return results
}
