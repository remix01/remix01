import { NextResponse } from 'next/server'
import { getActiveCategories } from '@/lib/dal/categories'

/**
 * GET /api/catalog/categories
 * List all active categories (for filter dropdown)
 */
export async function GET() {
  try {
    const categories = await getActiveCategories()
    
    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('[v0] Error in GET /api/catalog/categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
