// Data Access Layer - Obrtnik Profiles
import { createClient } from '@/lib/supabase/server'

export interface ObrtnikiFilter {
  minRating?: number
  search?: string
  limit?: number
  offset?: number
}

export interface ObrtnikiPublic {
  id: string
  business_name: string
  description: string | null
  is_verified: boolean
  avg_rating: number
  subscription_tier: 'start' | 'pro'
  stripe_customer_id: string | null
  created_at: string
  profiles: {
    id: string
    email: string
    phone: string | null
    full_name: string
    location_city: string | null
    location_region: string | null
  }
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
       is_verified,
       avg_rating,
       subscription_tier,
       stripe_customer_id,
       created_at,
       profiles!inner(
         id,
         email,
         phone,
         full_name,
         location_city,
         location_region
       )`
    )
    .eq('is_verified', true)
    .order('avg_rating', { ascending: false })

  // Rating filter
  if (filters?.minRating) {
    query = query.gte('avg_rating', filters.minRating)
  }

  // Search by business_name or description
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(
      `business_name.ilike.${searchTerm},description.ilike.${searchTerm}`
    )
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

  return data || []
}

/**
 * Get single obrtnik_profile by ID
 */
export async function getObrtnikiById(id: string): Promise<ObrtnikiPublic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select(
      `id,
       business_name,
       description,
       is_verified,
       avg_rating,
       subscription_tier,
       stripe_customer_id,
       created_at,
       profiles!inner(*)`
    )
    .eq('id', id)
    .eq('is_verified', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching obrtnik_profile:', error)
    return null
  }

  return data
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

  if (error) {
    console.error('Error fetching povprasevanja:', error)
    return []
  }

  return data || []
}

/**
 * Get dummy specialnosti - TODO: Replace with actual obrtnik_categories table
 */
export async function getActiveSpecialnosti(): Promise<string[]> {
  // TODO: When obrtnik_categories table exists, query it directly
  // For now, return placeholder data
  return [
    'Vodovodna dela',
    'Elektrika',
    'Krovske storitve',
    'Tesarstvo',
    'Keramika',
    'Obiranje',
    'Hlladilna tehnika',
    'Garaže',
  ]
}

/**
 * Get unique locations from profiles - TODO: Improve with dedicated locations table
 */
export async function getActiveLokacije(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('location_city')
    .not('location_city', 'is', null)
    .eq('role', 'obrtnik')

  if (error) {
    console.error('Error fetching locations:', error)
    return []
  }

  // Deduplicate and sort
  const locations = new Set<string>()
  data?.forEach((row) => {
    if (row.location_city) {
      locations.add(row.location_city)
    }
  })

  return Array.from(locations).sort()
}
