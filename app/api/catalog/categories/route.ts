import { getActiveCategories } from '@/lib/dal/categories'
import { ok, fail } from '@/lib/http/response'

/**
 * GET /api/catalog/categories
 * List all active categories (for filter dropdown)
 */
export async function GET() {
  try {
    const categories = await getActiveCategories()
    
    return ok({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('[v0] Error in GET /api/catalog/categories:', error)
    return fail('Failed to fetch categories', 500)
  }
}
