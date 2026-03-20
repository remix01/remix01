// Data Access Layer - Obrtnik Profiles
import { createClient } from '@/lib/supabase/server'

export interface ObrtnikiFilter {
  minRating?: number
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
  subscription_tier: 'start' | 'pro'
  hourly_rate: number | null
  years_experience: number | null
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

  // Flatten categories + apply category slug filter client-side
  let results = (data || []).map((row: any) => ({
    ...row,
    categories: (row.obrtnik_categories || [])
      .map((oc: any) => oc.categories)
      .filter(Boolean),
  }))

  if (filters?.kategorija) {
    results = results.filter((r: any) =>
      r.categories.some((c: any) => c.slug === filters.kategorija)
    )
  }

  return results
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

  return {
    ...(data as any),
    categories: ((data as any).obrtnik_categories || [])
      .map((oc: any) => oc.categories)
      .filter(Boolean),
  }
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
  ;(data || []).forEach((row: any) => {
    const city = row.profiles?.location_city || row.profiles?.[0]?.location_city
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
