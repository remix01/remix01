// Data Access Layer - Profiles
import { createClient } from '@/lib/supabase/server'
import type { 
  Profile, 
  ProfileInsert, 
  ProfileUpdate,
  ObrtnikProfile,
  ObrtnikProfileInsert,
  ObrtnikProfileUpdate 
} from '@/types/marketplace'

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching profile:', error)
    return null
  }

  return data as Profile | null
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching profile by email:', error)
    return null
  }

  return data as Profile | null
}

/**
 * Create a new profile
 */
export async function createProfile(profile: ProfileInsert): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating profile:', error)
    return null
  }

  return data as Profile | null
}

/**
 * Update profile
 */
export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[v0] Error updating profile:', error)
    return null
  }

  return data as Profile | null
}

/**
 * Get obrtnik profile with base profile data
 */
export async function getObrtnikProfile(obrtnikId: string): Promise<ObrtnikProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', obrtnikId)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching obrtnik profile:', error)
    return null
  }

  return data as unknown as ObrtnikProfile
}

/**
 * Get obrtnik profile with categories
 */
export async function getObrtnikWithCategories(obrtnikId: string): Promise<ObrtnikProfile | null> {
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
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching obrtnik with categories:', error)
    return null
  }

  // Transform the data to extract categories
  const transformed = {
    ...data,
    categories: (data as any).obrtnik_categories?.map((oc: any) => oc.category) || []
  }
  delete transformed.obrtnik_categories

  return transformed as unknown as ObrtnikProfile
}

/**
 * List verified obrtniki with filters
 */
export async function listObrtniki(filters?: {
  category_id?: string
  location_city?: string
  min_rating?: number
  is_available?: boolean
  limit?: number
  offset?: number
}): Promise<ObrtnikProfile[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_verified', true)

  if (filters?.is_available !== undefined) {
    query = query.eq('is_available', filters.is_available)
  }

  if (filters?.min_rating) {
    query = query.gte('avg_rating', filters.min_rating)
  }

  if (filters?.location_city) {
    query = query.eq('profile.location_city', filters.location_city)
  }

  if (filters?.category_id) {
    // Fetch IDs first — passing a query builder to .in() is not iterable
    // and causes: TypeError: object is not iterable (at new Set)
    const { data: catRows } = await supabase
      .from('obrtnik_categories')
      .select('obrtnik_id')
      .eq('category_id', filters.category_id)
    const categoryObrtnikiIds = (catRows ?? []).map((r) => r.obrtnik_id).filter(Boolean)
    if (categoryObrtnikiIds.length === 0) return []
    query = query.in('id', categoryObrtnikiIds)
  }

  query = query.order('avg_rating', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error listing obrtniki:', error)
    return []
  }

  return data as unknown as ObrtnikProfile[]
}

/**
 * Create obrtnik profile
 */
export async function createObrtnikProfile(profile: ObrtnikProfileInsert): Promise<ObrtnikProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .insert(profile)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating obrtnik profile:', error)
    return null
  }

  return data as ObrtnikProfile | null
}

/**
 * Update obrtnik profile
 */
export async function updateObrtnikProfile(obrtnikId: string, updates: ObrtnikProfileUpdate): Promise<ObrtnikProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .update(updates)
    .eq('id', obrtnikId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[v0] Error updating obrtnik profile:', error)
    return null
  }

  return data as ObrtnikProfile | null
}

/**
 * Add category to obrtnik
 */
export async function addObrtnikCategory(obrtnikId: string, categoryId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('obrtnik_categories')
    .insert({ obrtnik_id: obrtnikId, category_id: categoryId })

  if (error) {
    console.error('[v0] Error adding category to obrtnik:', error)
    return false
  }

  return true
}

/**
 * Remove category from obrtnik
 */
export async function removeObrtnikCategory(obrtnikId: string, categoryId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('obrtnik_categories')
    .delete()
    .eq('obrtnik_id', obrtnikId)
    .eq('category_id', categoryId)

  if (error) {
    console.error('[v0] Error removing category from obrtnik:', error)
    return false
  }

  return true
}

/**
 * Get obrtnik categories
 */
export async function getObrtnikCategories(obrtnikId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_categories')
    .select('category_id')
    .eq('obrtnik_id', obrtnikId)

  if (error) {
    console.error('[v0] Error fetching obrtnik categories:', error)
    return []
  }

  return data.map((item) => item.category_id)
}
