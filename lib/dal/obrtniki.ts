// Data Access Layer - Obrtnik Profiles
import { createClient } from '@/lib/supabase/server'

export interface ObrtnikiFilter {
  minRating?: number
  minPrice?: number
  maxPrice?: number
  search?: string
  kategorija?: string   // category slug
  lokacija?: string    // city name
  limit?: number
  offset?: number
}

export interface ObrtnikiPublic {
  id: string
  business_name: string
  description: string | null
  tagline: string | null
  is_verified: boolean
  avg_rating: number
  total_reviews: number
  is_available: boolean
  subscription_tier: 'start' | 'pro' | 'elite'
  hourly_rate: number | null
  years_experience: number | null
  number_of_ratings: number | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  service_radius_km: number | null
  created_at: string
  profiles: {
    id: string
    email: string
    phone: string | null
    full_name: string
    location_city: string | null
    location_region: string | null
  }
  categories: Array<{ name: string; slug: string; icon_name: string | null }>
}

/**
 * Get all verified obrtnik_profiles for public catalog with filters
 */
export async function listVerifiedObrtniki(
  filters?: ObrtnikiFilter
): Promise<ObrtnikiPublic[]> {
  const supabase = await createClient()

  let query = supabase
    .from('obrtnik_profiles')
    .select(
      `id,
       business_name,
       description,
       tagline,
       is_verified,
       avg_rating,
       total_reviews,
       is_available,
       subscription_tier,
       hourly_rate,
       years_experience,
       created_at,
       profiles!inner(
         id,
         email,
         phone,
         full_name,
         location_city,
         location_region
       ),
       obrtnik_categories(
         categories(
           name,
           slug,
           icon_name
         )
       )`
    )
    .eq('is_verified', true)
    .order('subscription_tier', { ascending: false }) // PRO first
    .order('avg_rating', { ascending: false })

  // Rating filter
  if (filters?.minRating) {
    query = query.gte('avg_rating', filters.minRating)
  }

  // Hourly rate filter
  const minPrice = filters?.minPrice
  const maxPrice = filters?.maxPrice
  if (Number.isFinite(minPrice)) {
    query = query.gte('hourly_rate', minPrice)
  }
  if (Number.isFinite(maxPrice)) {
    query = query.lte('hourly_rate', maxPrice)
  }

  // Search by business_name, description or tagline
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`business_name.ilike.${s},description.ilike.${s},tagline.ilike.${s}`)
  }

  // Location filter
  if (filters?.lokacija) {
    query = query.eq('profiles.location_city', filters.lokacija)
  }

  // Pagination
  const offset = filters?.offset || 0
  const limit = Math.min(filters?.limit || 20, 100)
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching obrtnik_profiles:', error)
    return []
  }

  type RawRow = typeof data extends (infer T)[] | null ? T : never
  type RawCategory = { name: string; slug: string; icon_name: string | null }

  // Flatten categories + apply category slug filter client-side
  let results = (data || []).map((row: RawRow) => {
    const rawRow = row as RawRow & {
      obrtnik_categories?: Array<{ categories: RawCategory | RawCategory[] | null }>
    }
    return {
      ...row,
      categories: (rawRow.obrtnik_categories || [])
        .flatMap((oc) => {
          if (!oc.categories) return []
          return Array.isArray(oc.categories) ? oc.categories : [oc.categories]
        })
        .filter((c): c is RawCategory => c !== null),
    }
  })

  if (filters?.kategorija) {
    results = results.filter((r) =>
      r.categories.some((c) => c.slug === filters.kategorija)
    )
  }

  return results as unknown as ObrtnikiPublic[]
}

/**
 * Get single obrtnik_profile by ID
 */
export async function getObrtnikiById(id: string): Promise<ObrtnikiPublic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select(
      `id, business_name, description, tagline, is_verified, avg_rating,
       total_reviews, is_available, subscription_tier, hourly_rate,
       years_experience, created_at,
       profiles!inner(*),
       obrtnik_categories(categories(name, slug, icon_name))`
    )
    .eq('id', id)
    .eq('is_verified', true)
    .maybeSingle()

  if (error || !data) return null

  type RawSingle = typeof data & {
    obrtnik_categories?: Array<{
      categories:
      | { name: string; slug: string; icon_name: string | null }
      | Array<{ name: string; slug: string; icon_name: string | null }>
      | null
    }>
  }
  const raw = data as RawSingle
  return {
    ...data,
    categories: (raw.obrtnik_categories || [])
      .flatMap((oc) => {
        if (!oc.categories) return []
        return Array.isArray(oc.categories) ? oc.categories : [oc.categories]
      })
      .filter((c): c is { name: string; slug: string; icon_name: string | null } => c !== null),
  } as unknown as ObrtnikiPublic
}

/**
 * Get active specialnosti (categories) from DB
 */
export async function getActiveSpecialnosti(): Promise<Array<{ name: string; slug: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('is_active', true)
    .order('sort_order')
  if (error) return []
  return data || []
}

/**
 * Get unique cities from verified obrtnik profiles
 */
export async function getActiveLokacije(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select('profiles!inner(location_city)')
    .eq('is_verified', true)
    .not('profiles.location_city', 'is', null)
  if (error) return []
  const cities = new Set<string>()
  ;(data || []).forEach((row) => {
    const profiles = row.profiles as
      | { location_city: string | null }
      | Array<{ location_city: string | null }>
      | null
    const city = Array.isArray(profiles)
      ? profiles[0]?.location_city
      : profiles?.location_city
    if (city) cities.add(city)
  })
  return Array.from(cities).sort()
}

/**
 * Get obrtnik's povprasevanja (inquiries/jobs)
 */
export async function getObrtnikiPovprasevanja(obrtnikiId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('povprasevanja')
    .select('*')
    .eq('obrtnik_id', obrtnikiId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}
