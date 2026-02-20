// Data Access Layer - Categories
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/marketplace'

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

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error fetching category:', error)
    return null
  }

  return data
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
    .single()

  if (error) {
    console.error('[v0] Error fetching category by slug:', error)
    return null
  }

  return data
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

  return data.map((item: any) => item.category)
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
  data.forEach((item: any) => {
    counts[item.category_id] = (counts[item.category_id] || 0) + 1
  })

  return counts
}
