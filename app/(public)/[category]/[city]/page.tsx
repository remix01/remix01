import type { Metadata } from 'next'
import { generateCategoryMeta, generateLocalBusinessSchema, generateServiceSchema } from '@/lib/seo/meta'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'

import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { ObrtnikCard } from '@/components/obrtnik-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { FAQSection } from '@/components/seo/faq-section'
import { RelatedCategories } from '@/components/seo/related-categories'
import { CategoryCityFallback } from '@/components/seo/CategoryCityFallback'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'
import { buildSeoContent, getInquiryLink, getRelatedCityLinks, RESERVED_DIRECTORY_SLUGS } from '@/lib/seo/programmatic-content'
import { normalizeDirectoryParams, resolveCategorySlugOrFallback, resolveCitySlugOrFallback } from '@/lib/seo/directory-routing'
import { safeProviderLookup } from '@/lib/marketplace/provider-lookup'
import { resolveMarketplaceIntent } from '@/lib/marketplace/resolve-marketplace-intent'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ category: string; city: string }>
}

export const revalidate = 300
export const dynamicParams = true

// Slugs that must never be treated as category/city pages — static assets,
// framework internals, and common scanner/bot targets that would otherwise
// trigger DB calls and cause static-to-dynamic rendering errors.
const RESERVED_SLUGS = RESERVED_DIRECTORY_SLUGS

export async function generateStaticParams() {
  // Generate all combinations of category slugs × city slugs
  try {
    const categories = await getActiveCategoriesPublic()

    const params: { category: string; city: string }[] = []
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
  try {
    const params = await props.params
    const normalized = normalizeDirectoryParams(params.category, params.city)
    const citySlug = normalized.city ?? ''

    if (
      RESERVED_SLUGS.has(normalized.category) ||
      normalized.category.includes('.') ||
      citySlug.includes('.')
    ) {
      return { title: 'LiftGO' }
    }

    const category = await resolveCategorySlugOrFallback(normalized.category)
    const city = resolveCitySlugOrFallback(citySlug)

    if (!category || !city || !category.name || !city.name) {
      return { title: 'LiftGO' }
    }

    const providerResult = await safeProviderLookup({ categoryId: category.id, cityName: city.name, limit: 1 })

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
      robots: providerResult.ok && !providerResult.hasProviders ? { index: false, follow: true } : undefined,
      alternates: { canonical: `https://liftgo.net/${category.slug}/${city.slug}` },
      openGraph: {
        title: meta.openGraph.title,
        description: meta.openGraph.description,
        type: 'website',
        locale: 'sl_SI',
        siteName: 'LiftGO',
        url: `https://liftgo.net/${category.slug}/${city.slug}`
      }
    }
  } catch (error) {
    console.error('[category-city-metadata] generateMetadata failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { title: 'LiftGO' }
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

export default async function CategoryCityPage(props: Props) {
  const params = await props.params
  const normalized = normalizeDirectoryParams(params.category, params.city)
  const citySlug = normalized.city ?? ''
  const pathname = `/${normalized.category}/${citySlug}`

  // Reject reserved slugs and dotfile-style segments (e.g. /.aws/credentials, /actuator/env)
  if (
    RESERVED_SLUGS.has(normalized.category) ||
    normalized.category.includes('.') ||
    citySlug.includes('.')
  ) {
    notFound()
  }

  const resolvedCategory = await resolveCategorySlugOrFallback(normalized.category).catch(() => null)
  const resolvedCity = resolveCitySlugOrFallback(citySlug)

  const initialIntent = await resolveMarketplaceIntent({
    categorySlug: normalized.category,
    citySlug,
  })

  if (initialIntent.kind === 'scanner_or_reserved' || initialIntent.kind === 'unknown_invalid') {
    notFound()
  }

  const category = resolvedCategory || { id: `fallback:${normalized.category}`, name: humanizeSlug(normalized.category), slug: normalized.category }
  const city = resolvedCity || { name: humanizeSlug(citySlug), slug: citySlug, region: 'Slovenija' }

  let providerResult = resolvedCategory && resolvedCity
    ? await safeProviderLookup({ categoryId: resolvedCategory.id, cityName: resolvedCity.name, limit: 12 })
    : { ok: false as const, error: 'category_or_city_missing' }

  const intent = await resolveMarketplaceIntent({
    categorySlug: normalized.category,
    citySlug,
    providerLookupOk: providerResult.ok,
    hasProviders: providerResult.ok ? providerResult.hasProviders : false,
  })

  if (intent.kind === 'scanner_or_reserved' || intent.kind === 'unknown_invalid') {
    notFound()
  }

  const obrtniki = providerResult.ok ? providerResult.providers : []
  const dataWarning = providerResult.ok ? null : 'Podatki o mojstrih so začasno nedosegljivi. Stran je prikazana v varnem načinu.'
  const nearbyCities = getNearbyCities(city.region, citySlug)

  // Get pricing for schema
  const seoContent = buildSeoContent({ categoryName: category.name, categorySlug: category.slug, citySlug, cityName: city.name })
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
    description: seoContent.schemaDescription,
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

        <section className="py-10 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-4">{category.name} storitve v mestu {city.name}</h2>
            <p className="text-gray-700 max-w-4xl mb-6">
              {seoContent.whatToExpect}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/${normalized.category}`} className="underline text-blue-700">Nazaj na {category.name} po Sloveniji</Link>
              <Link href={getInquiryLink(normalized.category, citySlug)} className="underline text-blue-700">Oddaj povpraševanje v mestu {city.name}</Link>
            </div>
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

        {obrtniki.length === 0 && (
          <CategoryCityFallback
            categoryName={category.name}
            cityName={city.name}
            serviceSlug={normalized.category}
            locationSlug={citySlug}
            state={
              intent.kind === 'provider_lookup_error' ? 'provider_lookup_error' :
              intent.kind === 'category_not_listed_yet' ? 'category_not_listed_yet' :
              intent.kind === 'location_not_listed_yet' ? 'location_not_listed_yet' :
              intent.kind === 'global_market_coming_soon' || intent.kind === 'human_service_location_intent' ? 'global_market_coming_soon' :
              'zero_providers'
            }
            relatedCities={nearbyCities.map((nearbyCity) => ({
              href: `/${normalized.category}/${nearbyCity.slug}`,
              label: `${category.name.split(' ')[0]} ${nearbyCity.name}`
            }))}
            relatedCategories={[]}
          />
        )}

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
          canonicalPath={`https://liftgo.net/${normalized.category}/${citySlug}`}
          items={seoContent.faqItems}
        />

        <section className="py-10 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">{seoContent.relatedCitiesLabel}</h2>
            <div className="flex flex-wrap gap-3">
              {getRelatedCityLinks(normalized.category, citySlug).map((link) => (
                <Link key={link.href} href={link.href} className="px-3 py-2 text-sm border rounded-md hover:bg-white">{link.label}</Link>
              ))}
            </div>
          </div>
        </section>

        {/* Related Categories */}
        <RelatedCategories
          currentCategorySlug={normalized.category}
          citySlug={citySlug}
        />
      </main>
    </>
  )
}
