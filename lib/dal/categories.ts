// Data Access Layer - Categories
import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Category } from '@/types/marketplace'
import { checkUserRateLimit, checkIpRateLimit } from '@/lib/utils/rateLimiter'
import { validateCategoryName } from '@/lib/utils/categoryValidation'

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

  return data
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

  return data as Category[]
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

  return data.map((item) => (item as { category: Category }).category)
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

  const counts: Record<string, number> = {}
  data.forEach((item) => {
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
  // Validate using shared rules (same regex + bounds used by frontend + SQL function)
  const validation = validateCategoryName(name)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  const trimmedName = name.trim()

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

  // Delegate to the SECURITY DEFINER RPC – handles lookup, slug generation,
  // uniqueness, and race conditions server-side, bypassing direct-INSERT RLS.
  const { data: rpcId, error: rpcError } = await supabase
    .rpc('create_or_find_category', {
      p_name: trimmedName,
      p_user_id: userId ?? null,
    })

  if (rpcError) {
    console.error('[v0] Error in create_or_find_category RPC:', rpcError)
    throw new Error(
      rpcError.message?.startsWith('Kategorija')
        ? rpcError.message
        : 'Napaka pri ustvarjanju nove kategorije'
    )
  }

  return rpcId as string
}
