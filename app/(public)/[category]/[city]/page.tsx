import type { Metadata } from 'next'
import { generateCategoryMeta, generateLocalBusinessSchema, generateServiceSchema } from '@/lib/seo/meta'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'
import { listObrtniki } from '@/lib/dal/profiles'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { ObrtnikCard } from '@/components/obrtnik-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { FAQSection } from '@/components/seo/faq-section'
import { RelatedCities } from '@/components/seo/related-cities'
import { RelatedCategories } from '@/components/seo/related-categories'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'
import { fetchWithRetry } from '@/lib/fetchWithRetry'
import { normalizeDirectoryParams, resolveCategorySlugOrFallback, resolveCitySlugOrFallback } from '@/lib/seo/directory-routing'
import { env } from '@/lib/env'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ category: string; city: string }>
}

export const revalidate = 300
export const dynamicParams = true

// Exclude static files and reserved paths from being caught by dynamic route
const EXCLUDED_PATHS = [
  'images', 'icons', 'fonts', 'api', 'admin',
  '_next', 'static', 'favicon.ico', 'robots.txt',
  'sitemap.xml', 'sw.js', 'manifest.json'
]

export async function generateStaticParams() {
  // Generate all combinations of category slugs × city slugs
  try {
    const categories = await getActiveCategoriesPublic()

    const params = []
    for (const category of categories) {
      for (const city of SLOVENIAN_CITIES) {
        params.push({
          category: category.slug,
          city: city.slug
        })
      }
    }
    return params
  } catch (error) {
    console.error('[v0] Error generating static params for category+city:', error)
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const normalized = normalizeDirectoryParams(params.category, params.city)
  const citySlug = normalized.city ?? ''

  // Exclude static paths and file extensions
  if (
    EXCLUDED_PATHS.includes(normalized.category) ||
    normalized.category.includes('.') ||
    citySlug.includes('.')
  ) {
    return { title: 'LiftGO' }
  }

  const category = await resolveCategorySlugOrFallback(normalized.category)
  const city = resolveCitySlugOrFallback(citySlug)

  if (!category || !city) {
    return { title: 'LiftGO' }
  }

  const meta = generateCategoryMeta({
    categoryName: category.name,
    categorySlug: category.slug,
    cityName: city.name,
    citySlug: city.slug
  })

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.openGraph.title,
      description: meta.openGraph.description,
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO'
    }
  }
}

// Helper to get neighboring cities based on region
function getNearbyCities(region: string, currentCity: string) {
  return SLOVENIAN_CITIES.filter(
    c => c.region === region && c.slug !== currentCity
  ).slice(0, 5)
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function fetchDirectoryData(category: string, city: string) {
  const pathname = `/${category}/${city}`
  const endpoint = `/pro/${encodeURIComponent(category)}/${encodeURIComponent(city)}`
  const baseCandidates = Array.from(new Set([
    process.env.DIRECTORY_API_BASE_URL,
    env.NEXT_PUBLIC_APP_URL,
    'https://liftgo.net',
    'https://api.liftgo.net',
  ]
    .filter((value): value is string => !!value)
    .map(value => value.replace(/\/$/, ''))))

  let lastResult: Awaited<ReturnType<typeof fetchWithRetry<{
    providers?: Array<Record<string, unknown>>
    category?: string
    city?: string
  }>>> | null = null

  for (const baseUrl of baseCandidates) {
    const apiUrl = `${baseUrl}${endpoint}`
    const result = await fetchWithRetry<{
      providers?: Array<Record<string, unknown>>
      category?: string
      city?: string
    }>(apiUrl, {
      retries: 2,
      timeoutMs: 2500,
      initialDelayMs: 250,
      next: { revalidate },
      requestLabel: `${pathname}@${baseUrl}`,
    })

    if (result.ok) {
      return result
    }

    lastResult = result
    const canTryNextBase = result.reason === 'network_error' || result.reason === 'timeout'
    if (!canTryNextBase) {
      return result
    }
  }

  return lastResult ?? {
    ok: false,
    status: null,
    attempt: 0,
    durationMs: 0,
    isMissing: false,
    isTransient: true,
    reason: 'unknown_error',
    cacheStatus: null,
  }
}

export default async function CategoryCityPage(props: Props) {
  const params = await props.params
  const normalized = normalizeDirectoryParams(params.category, params.city)
  const citySlug = normalized.city ?? ''
  const pathname = `/${normalized.category}/${citySlug}`

  // Exclude static files, reserved paths, and dotfile-style segments (e.g. /.aws/credentials)
  if (
    EXCLUDED_PATHS.includes(normalized.category) ||
    normalized.category.includes('.') ||
    citySlug.includes('.')
  ) {
    notFound()
  }

  const resolvedCategory = await resolveCategorySlugOrFallback(normalized.category)
  const resolvedCity = resolveCitySlugOrFallback(citySlug)
  const category = resolvedCategory || {
    id: `fallback:${normalized.category}`,
    name: humanizeSlug(normalized.category),
    slug: normalized.category,
  }
  const city = resolvedCity || {
    name: humanizeSlug(citySlug),
    slug: citySlug,
    region: 'Slovenija',
  }

  if (!resolvedCategory || !resolvedCity) {
    console.info('[category-city-page] fallback_route_render', {
      pathname,
      params,
      found: true,
      reason_not_found: 'category_or_city_missing_fallback',
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.VERCEL_REGION,
    })
  }

  const externalResult = await fetchDirectoryData(normalized.category, citySlug)

  if (!externalResult.ok && externalResult.isMissing) {
    console.info('[category-city-page] external_missing_continue', {
      pathname,
      params,
      found: true,
      reason_not_found: externalResult.reason,
      status: externalResult.status,
      fetchDurationMs: externalResult.durationMs,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.VERCEL_REGION,
    })
  }

  let obrtniki = [] as Awaited<ReturnType<typeof listObrtniki>>
  let dataWarning: string | null = null

  try {
    if (resolvedCategory) {
      obrtniki = await listObrtniki({
        category_id: category.id,
        location_city: city.name,
        is_available: true,
        limit: 12
      })
    }
  } catch (error) {
    dataWarning = 'Podatki o mojstrih so začasno nedosegljivi. Poskusite osvežiti stran čez nekaj trenutkov.'
    console.warn('[category-city-page] obrtniki_fetch_failed', {
      pathname,
      params,
      found: true,
      reason_not_found: 'none',
      fetchDurationMs: null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.VERCEL_REGION,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  if (!externalResult.ok && externalResult.isTransient && !dataWarning) {
    dataWarning = 'Stran je trenutno prikazana v varnem načinu zaradi začasnih težav s podatkovnim virom.'
  }

  console.info('[category-city-page] render', {
    pathname,
    params,
    found: true,
    reason_not_found: 'none',
    fetchDurationMs: externalResult.durationMs,
    externalStatus: externalResult.status,
    externalSourceOk: externalResult.ok,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    region: process.env.VERCEL_REGION,
  })

  const nearbyCities = getNearbyCities(city.region, citySlug)

  // Get pricing for schema
  const pricing = getPricingForCategory(normalized.category)

  // Generate schema markup
  const businessSchema = generateLocalBusinessSchema({
    categoryName: category.name,
    cityName: city.name,
    obrtnikCount: obrtniki.length,
    avgRating: obrtniki.length > 0
      ? obrtniki.reduce((sum, o) => sum + (o.avg_rating || 0), 0) / obrtniki.length
      : 0
  })

  const serviceSchema = generateServiceSchema({
    categoryName: category.name,
    cityName: city.name,
    description: 'Preverjeni ' + category.name.toLowerCase() + ' mojstri v ' + city.name + ' s hirim odzivom in ocenami strank.',
    minPrice: pricing.minHourly,
    maxPrice: pricing.maxHourly
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: category.name, href: '/' + normalized.category },
        { name: city.name, href: '/' + normalized.category + '/' + citySlug }
      ]} />

      <main className="min-h-screen">
        {dataWarning && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm text-center">
            {dataWarning}
          </div>
        )}

        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              {category.name} v {city.name}
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              Preverjeni {category.name.toLowerCase()} mojstri v {city.name}.
              Brezplačno povpraševanje, odziv v 2 urah.
            </p>
            <Link href="/novo-povprasevanje">
              <Button size="lg" className="gap-2">
                Oddaj brezplačno povpraševanje <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Obrtniki Grid */}
        <section className="py-12 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12">
              Preverjeni {category.name.toLowerCase()} mojstri v {city.name}
            </h2>

            {obrtniki.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {obrtniki.map(obrtnik => (
                  <ObrtnikCard key={obrtnik.id} obrtnik={obrtnik} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600 mb-6">
                  Trenutno ni {category.name.toLowerCase()} mojstrov v {city.name}
                </p>
                <Link href="/za-obrtnike">
                  <Button variant="outline" size="lg">
                    Postani prvi partnerski mojster v mestu
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="py-12 md:py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-3xl font-bold mb-12">
                {category.name} v bližnjih mestih
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {nearbyCities.map(nearbyCity => (
                  <Link
                    key={nearbyCity.slug}
                    href={`/${normalized.category}/${nearbyCity.slug}`}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow text-center"
                  >
                    <p className="font-medium text-sm">
                      {category.name.split(' ')[0]} {nearbyCity.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <FAQSection
          categoryName={category.name}
          categorySlug={normalized.category}
          cityName={city.name}
        />

        {/* Related Cities */}
        <RelatedCities
          categorySlug={normalized.category}
          categoryName={category.name}
          currentCitySlug={citySlug}
        />

        {/* Related Categories */}
        <RelatedCategories
          currentCategorySlug={normalized.category}
          citySlug={citySlug}
        />
      </main>
    </>
  )
}
