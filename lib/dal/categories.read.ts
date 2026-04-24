import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Category } from '@/types/marketplace'

// Guard to avoid noisy repeated public-fetch logs during build/runtime retries.
const categoriesGlobalState = globalThis as typeof globalThis & {
  __hasLoggedPublicCategoriesFetchFailure?: boolean
}

export function getPublicSupabaseClient() {
  return createPublicClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function getActiveCategoriesPublic(): Promise<Category[]> {
  const supabase = getPublicSupabaseClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    if (!categoriesGlobalState.__hasLoggedPublicCategoriesFetchFailure) {
      console.error('[v0] Error fetching categories (public):', error)
      categoriesGlobalState.__hasLoggedPublicCategoriesFetchFailure = true
    }
    return []
  }

  return data
}

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

  return data.flatMap((item) => {
    const category = (item as { category: Category | Category[] | null }).category
    if (!category) return []
    return Array.isArray(category) ? category : [category]
  })
}

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
