// Data Access Layer - Partners (Obrtniki)
import { createClient } from '@/lib/supabase/server'
import type { 
  ObrtnikProfile, 
  ObrtnikFilters 
} from '@/types/marketplace'

/**
 * List verified obrtniki with filters (for public catalog)
 */
export async function listVerifiedObrtnikiWithFilters(
  filters?: ObrtnikFilters & {
    search?: string
    limit?: number
    offset?: number
  }
): Promise<ObrtnikProfile[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*),
      obrtnik_categories(
        category:categories(*)
      )
    `)
    .eq('is_verified', true)
    .order('avg_rating', { ascending: false })

  // Availability filter
  if (filters?.is_available !== undefined) {
    query = query.eq('is_available', filters.is_available)
  }

  // Rating filter
  if (filters?.min_rating) {
    query = query.gte('avg_rating', filters.min_rating)
  }

  // Location filter
  if (filters?.location_city) {
    query = query.filter('profile', 'cs', JSON.stringify({ location_city: filters.location_city }))
  }

  // Category filter (join through obrtnik_categories)
  if (filters?.category_id) {
    // Note: This is a limitation - we can't easily filter by joined table in Supabase
    // Client will need to filter or we need a view/RPC function
    // For now, we'll fetch and filter client-side
  }

  // Pagination
  if (filters?.limit) {
    const offset = filters.offset || 0
    query = query.range(offset, offset + filters.limit - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error listing verified obrtniki:', error)
    return []
  }

  // Transform data to extract categories
  let results = (data || []).map((item: any) => ({
    ...item,
    categories: item.obrtnik_categories?.map((oc: any) => oc.category) || []
  }))

  // Client-side filtering for complex queries
  if (filters?.search) {
    const search = filters.search.toLowerCase()
    results = results.filter(
      (o: any) =>
        o.business_name.toLowerCase().includes(search) ||
        o.description?.toLowerCase().includes(search)
    )
  }

  if (filters?.category_id) {
    results = results.filter(
      (o: any) => o.categories?.some((c: any) => c.id === filters.category_id)
    )
  }

  return results as unknown as ObrtnikProfile[]
}

/**
 * Get obrtnik by ID with all relations (for public profile page)
 */
export async function getPublicObrtnikProfile(obrtnikId: string): Promise<ObrtnikProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*),
      obrtnik_categories(
        category:categories(*)
      )
    `)
    .eq('id', obrtnikId)
    .eq('is_verified', true)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching public obrtnik profile:', error)
    return null
  }

  if (!data) {
    return null
  }

  // Transform to extract categories
  const result = {
    ...data,
    categories: data.obrtnik_categories?.map((oc: any) => oc.category) || []
  }

  delete (result as any).obrtnik_categories

  return result as unknown as ObrtnikProfile
}

/**
 * Get top rated obrtniki for a category
 */
export async function getTopRatedObrtnikiByCategory(
  categoryId: string,
  limit: number = 5
): Promise<ObrtnikProfile[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_categories')
    .select(`
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      )
    `)
    .eq('category_id', categoryId)
    .eq('obrtnik.is_verified', true)
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching top rated obrtniki:', error)
    return []
  }

  if (!data) return []

  return (data || []).map((item: any) => item.obrtnik).filter(Boolean)
}

/**
 * Search obrtniki by name or business name
 */
export async function searchObrtnikiByName(
  searchTerm: string,
  limit: number = 10
): Promise<ObrtnikProfile[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_verified', true)
    .or(`business_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('avg_rating', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error searching obrtniki:', error)
    return []
  }

  return (data || []) as unknown as ObrtnikProfile[]
}

/**
 * Get nearby obrtniki by location (basic - exact city match for MVP)
 */
export async function getNearbyObrtnikiByCity(
  city: string,
  limit: number = 10
): Promise<ObrtnikProfile[]> {
  const supabase = await createClient()
  
  const { data: profiles, error } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_verified', true)
    .filter('profile.location_city', 'eq', city)
    .order('avg_rating', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching nearby obrtniki:', error)
    return []
  }

  return (profiles || []) as unknown as ObrtnikProfile[]
}

/**
 * Get obrtnik availability status
 */
export async function getObrtnikAvailability(obrtnikId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select('is_available')
    .eq('id', obrtnikId)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching obrtnik availability:', error)
    return false
  }

  return data?.is_available || false
}

/**
 * Count total verified obrtniki by category
 */
export async function countObrtnikiByCategory(categoryId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('obrtnik_categories')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (error) {
    console.error('[v0] Error counting obrtniki by category:', error)
    return 0
  }

  return count || 0
}
