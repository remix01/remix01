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
    .single()

  if (error) {
    console.error('[v0] Error fetching profile:', error)
    return null
  }

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error fetching profile by email:', error)
    return null
  }

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error creating profile:', error)
    return null
  }

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error updating profile:', error)
    return null
  }

  return data
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
    .single()

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
    .single()

  if (error) {
    console.error('[v0] Error fetching obrtnik with categories:', error)
    return null
  }

  // Transform the data to extract categories
  const transformed = {
    ...data,
    categories: data.obrtnik_categories?.map((oc: any) => oc.category) || []
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
    // Filter by category through join
    query = query.in('id', 
      supabase
        .from('obrtnik_categories')
        .select('obrtnik_id')
        .eq('category_id', filters.category_id)
    )
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
    .single()

  if (error) {
    console.error('[v0] Error creating obrtnik profile:', error)
    return null
  }

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error updating obrtnik profile:', error)
    return null
  }

  return data
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
