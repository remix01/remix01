import { NextRequest } from 'next/server'
import { listVerifiedObrtnikiWithFilters } from '@/lib/dal/partners'
import { getActiveCategories } from '@/lib/dal/categories'
import type { ObrtnikFilters } from '@/types/marketplace'
import { ok, fail } from '@/lib/http/response'

/**
 * GET /api/catalog/craftsment
 * List craftsment with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Build filters from query parameters
    const filters: ObrtnikFilters & { search?: string; limit?: number; offset?: number } = {}

    if (searchParams.has('search')) {
      filters.search = searchParams.get('search') || undefined
    }

    if (searchParams.has('category_id')) {
      filters.category_id = searchParams.get('category_id') || undefined
    }

    if (searchParams.has('location_city')) {
      filters.location_city = searchParams.get('location_city') || undefined
    }

    if (searchParams.has('min_rating')) {
      const rating = parseFloat(searchParams.get('min_rating') || '0')
      if (!isNaN(rating)) {
        filters.min_rating = rating
      }
    }

    if (searchParams.has('is_available')) {
      filters.is_available = searchParams.get('is_available') === 'true'
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    filters.limit = limit
    filters.offset = offset

    // Fetch craftsment
    const craftsment = await listVerifiedObrtnikiWithFilters(filters)

    return ok({
      success: true,
      data: craftsment,
      pagination: {
        limit,
        offset,
        total: craftsment.length,
      },
    })
  } catch (error) {
    console.error('[v0] Error in GET /api/catalog/craftsmen:', error)
    return fail('Failed to fetch craftsment', 500)
  }
}

/**
 * GET /api/catalog/categories
 * List all active categories (for filter dropdown)
 */
export async function GET_CATEGORIES(request: NextRequest) {
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
