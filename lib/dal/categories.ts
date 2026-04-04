// Data Access Layer - Categories
import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Category } from '@/types/marketplace'
import { slugify } from '@/lib/utils/slugify'
import { checkUserRateLimit, checkIpRateLimit } from '@/lib/utils/rateLimiter'

/**
 * Get public Supabase client (no cookies, uses ANON key)
 * Use this ONLY in generateStaticParams and generateMetadata
 */
export function getPublicSupabaseClient() {
  return createPublicClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get all active categories (public version for build time)
 * Use this in generateStaticParams
 */
export async function getActiveCategoriesPublic(): Promise<Category[]> {
  const supabase = getPublicSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[v0] Error fetching categories (public):', error)
    return []
  }

  return (data ?? []) as Category[]
}

/**
 * Get all active categories
 */
export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[v0] Error fetching categories:', error)
    return []
  }

  return (data ?? []) as Category[]
}

/**
 * Get category by ID
 */
export async function getCategory(categoryId: string): Promise<Category | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching category:', error)
    return null
  }

  return data as Category | null
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching category by slug:', error)
    return null
  }

  return data as Category | null
}

/**
 * Get categories for an obrtnik
 */
export async function getObrtnikCategories(obrtnikId: string): Promise<Category[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_categories')
    .select(`
      category:categories(*)
    `)
    .eq('obrtnik_id', obrtnikId)

  if (error) {
    console.error('[v0] Error fetching obrtnik categories:', error)
    return []
  }

  return (data ?? []).map((item) => (item as { category: Category }).category)
}

/**
 * Count obrtniki per category
 */
export async function countObrtnikPerCategory(): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_categories')
    .select('category_id')

  if (error) {
    console.error('[v0] Error counting obrtnik per category:', error)
    return {}
  }

  const counts = {} as Record<string, number>
  ;(data ?? []).forEach((item) => {
    const row = item as { category_id: string }
    counts[row.category_id] = (counts[row.category_id] || 0) + 1
  })

  return counts
}

/**
 * Get or create a category by name
 * If category exists (case-insensitive), returns it
 * If not found, creates a new auto-created category
 * 
 * @param name Category name provided by user
 * @param userId User ID for rate limiting
 * @param ipAddress IP address for rate limiting
 * @returns Category ID
 * @throws Error if validation fails or rate limit exceeded
 */
export async function getOrCreateCategory(
  name: string,
  userId?: string,
  ipAddress?: string
): Promise<string> {
  // Validate category name
  const trimmedName = name.trim()
  
  if (trimmedName.length < 2) {
    throw new Error('Kategorija mora imeti najmanj 2 znaka')
  }
  
  if (trimmedName.length > 100) {
    throw new Error('Kategorija ne sme biti daljša od 100 znakov')
  }

  // Check for invalid characters (allow only letters, numbers, spaces, and hyphens)
  if (!/^[a-žA-Ž0-9\s\-&]+$/u.test(trimmedName)) {
    throw new Error('Kategorija sme vsebovati samo črke, številke, presledke in vezaje')
  }

  // Check rate limits if user/IP provided
  if (userId) {
    const userLimit = await checkUserRateLimit(userId)
    if (!userLimit.allowed) {
      throw new Error(
        `Prekoračili ste limit ustvarjanja kategorij. Poskusite ponovno po ${userLimit.resetAt.toLocaleTimeString('sl-SI')}`
      )
    }
  }

  if (ipAddress) {
    const ipLimit = await checkIpRateLimit(ipAddress)
    if (!ipLimit.allowed) {
      throw new Error('Prekoračili ste limit ustvarjanja kategorij z te IP naslova')
    }
  }

  const supabase = await createClient()
  
  // Try to find existing category (case-insensitive)
  const { data: existing, error: searchError } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', trimmedName)
    .eq('is_active', true)
    .maybeSingle()

  if (searchError && searchError.code !== 'PGRST116') {
    console.error('[v0] Error searching for existing category:', searchError)
    throw new Error('Napaka pri preverjanju kategorije')
  }

  if (existing) {
    return existing.id
  }

  // Generate slug from name
  const baseSlug = slugify(trimmedName)
  let slug = baseSlug
  let counter = 1

  // Check if slug already exists, if so append counter
  let slugExists = true
  while (slugExists) {
    const { data: slugCheck, error: slugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (slugError && slugError.code !== 'PGRST116') {
      console.error('[v0] Error checking slug:', slugError)
      throw new Error('Napaka pri generiranju slugja')
    }

    if (!slugCheck) {
      slugExists = false
    } else {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  // Create new category
  const { data: newCategory, error: insertError } = await supabase
    .from('categories')
    .insert({
      name: trimmedName,
      slug,
      is_active: true,
      is_auto_created: true,
      icon_name: 'folder', // Default icon
      description: `Uporabnik definirano - ${new Date().toLocaleDateString('sl-SI')}`,
      sort_order: 999, // Low priority, sorted last
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[v0] Error creating category:', insertError)
    
    // If unique constraint failed, try to find it again (race condition)
    const { data: retry } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', trimmedName)
      .eq('is_active', true)
      .maybeSingle()

    if (retry) {
      return retry.id
    }

    throw new Error('Napaka pri ustvarjanju nove kategorije')
  }

  return newCategory.id
}
