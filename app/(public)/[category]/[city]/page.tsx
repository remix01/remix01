import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generateCategoryMeta, generateLocalBusinessSchema, generateServiceSchema } from '@/lib/seo/meta'
import { getCategoryBySlug, getActiveCategoriesPublic } from '@/lib/dal/categories'
import { listObrtniki } from '@/lib/dal/profiles'
import { getCityBySlug, SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { ObrtnikCard } from '@/components/obrtnik-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { FAQSection } from '@/components/seo/faq-section'
import { RelatedCities } from '@/components/seo/related-cities'
import { RelatedCategories } from '@/components/seo/related-categories'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'

interface Props {
  params: Promise<{ category: string; city: string }>
}

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
  
  // Exclude static paths and file extensions
  if (EXCLUDED_PATHS.includes(params.category) || params.city.includes('.')) {
    return { title: 'LiftGO' }
  }
  
  const category = await getCategoryBySlug(params.category)
  const city = getCityBySlug(params.city)

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

export default async function CategoryCityPage(props: Props) {
  const params = await props.params
  
  // Exclude static files and reserved paths
  if (EXCLUDED_PATHS.includes(params.category) || params.city.includes('.')) {
    notFound()
  }
  
  const category = await getCategoryBySlug(params.category)
  const city = getCityBySlug(params.city)

  if (!category || !city) {
    notFound()
  }

  // Fetch obrtniki filtered by both category and city
  const obrtniki = await listObrtniki({
    category_id: category.id,
    location_city: city.name,
    is_available: true,
    limit: 12
  })

  const nearbyCities = getNearbyCities(city.region, params.city)

  // Get pricing for schema
  const pricing = getPricingForCategory(params.category)

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
        { name: category.name, href: '/' + params.category },
        { name: city.name, href: '/' + params.category + '/' + params.city }
      ]} />

      <main className="min-h-screen">
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
            <Link href="/narocnik/novo-povprasevanje">
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
                    href={`/${params.category}/${nearbyCity.slug}`}
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
          categorySlug={params.category}
          cityName={city.name}
        />

        {/* Related Cities */}
        <RelatedCities
          categorySlug={params.category}
          categoryName={category.name}
          currentCitySlug={params.city}
        />

        {/* Related Categories */}
        <RelatedCategories
          currentCategorySlug={params.category}
          citySlug={params.city}
        />
      </main>
    </>
  )
}
