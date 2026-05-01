import { NextRequest, NextResponse } from 'next/server'
import { listVerifiedObrtniki } from '@/lib/dal/obrtniki'
import { normalizeDirectoryParams, resolveCategorySlugOrFallback, resolveCitySlugOrFallback } from '@/lib/seo/directory-routing'

export const revalidate = 300

interface Params {
  params: Promise<{ category: string; city: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { category: rawCategory, city: rawCity } = await params
  const normalized = normalizeDirectoryParams(rawCategory, rawCity)
  const citySlug = normalized.city ?? ''

  const [resolvedCategory, resolvedCity] = await Promise.all([
    resolveCategorySlugOrFallback(normalized.category),
    Promise.resolve(resolveCitySlugOrFallback(citySlug)),
  ])

  if (!resolvedCategory || !resolvedCity) {
    return NextResponse.json(
      { error: 'Not found', category: normalized.category, city: citySlug },
      { status: 404 }
    )
  }

  const providers = await listVerifiedObrtniki({
    kategorija: resolvedCategory.slug,
    lokacija: resolvedCity.name,
    limit: 20,
  })

  return NextResponse.json({
    category: resolvedCategory.slug,
    categoryName: resolvedCategory.name,
    city: resolvedCity.slug,
    cityName: resolvedCity.name,
    providers: providers.map((p) => ({
      id: p.id,
      business_name: p.business_name,
      tagline: p.tagline,
      avg_rating: p.avg_rating,
      total_reviews: p.total_reviews,
      subscription_tier: p.subscription_tier,
      hourly_rate: p.hourly_rate,
      years_experience: p.years_experience,
      is_available: p.is_available,
      categories: p.categories,
      location_city: p.profiles?.location_city,
    })),
  })
}
