import { NextRequest, NextResponse } from 'next/server'
import { listVerifiedObrtniki, type ObrtnikiPublic } from '@/lib/dal/obrtniki'

type PublicMasterDto = Omit<ObrtnikiPublic, 'profiles'> & {
  profiles: Pick<ObrtnikiPublic['profiles'], 'id' | 'full_name' | 'location_city' | 'location_region'>
}

/**
 * GET /api/masters
 * Public masters catalog with query-based filters.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams

    const ratingRaw = params.get('rating')
    const minPriceRaw = params.get('min_price')
    const maxPriceRaw = params.get('max_price')
    const limitRaw = params.get('limit')
    const offsetRaw = params.get('offset')

    const rating = ratingRaw ? Number.parseFloat(ratingRaw) : undefined
    const minPrice = minPriceRaw ? Number.parseFloat(minPriceRaw) : undefined
    const maxPrice = maxPriceRaw ? Number.parseFloat(maxPriceRaw) : undefined
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0

    const masters = await listVerifiedObrtniki({
      search: params.get('search') || undefined,
      kategorija: params.get('category') || undefined,
      lokacija: params.get('location') || undefined,
      minRating: Number.isFinite(rating) ? rating : undefined,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20,
      offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
    })

    const publicMasters: PublicMasterDto[] = masters.map((master) => ({
      ...master,
      profiles: {
        id: master.profiles.id,
        full_name: master.profiles.full_name,
        location_city: master.profiles.location_city,
        location_region: master.profiles.location_region,
      },
    }))

    return NextResponse.json(
      {
        success: true,
        data: publicMasters,
        meta: {
          count: publicMasters.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('[api/masters] Failed to fetch masters:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch masters' }, { status: 500 })
  }
}
