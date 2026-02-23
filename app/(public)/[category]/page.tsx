import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generateCategoryMeta, generateLocalBusinessSchema, generateServiceSchema } from '@/lib/seo/meta'
import { getCategoryBySlug, getActiveCategoriesPublic } from '@/lib/dal/categories'
import { listObrtniki } from '@/lib/dal/profiles'
import { ObrtnikCard } from '@/components/obrtnik-card'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { FAQSection } from '@/components/seo/faq-section'
import { RelatedCities } from '@/components/seo/related-cities'
import { RelatedCategories } from '@/components/seo/related-categories'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'

interface Props {
  params: Promise<{ category: string }>
}

// Exclude static files and reserved paths from being caught by dynamic route
const EXCLUDED_PATHS = [
  'images', 'icons', 'fonts', 'api', 'admin', 
  '_next', 'static', 'favicon.ico', 'robots.txt',
  'sitemap.xml', 'sw.js', 'manifest.json'
]

export async function generateStaticParams() {
  // Fetch all active categories from database
  // This will be called at build time for static generation
  try {
    const categories = await getActiveCategoriesPublic()
    return categories.map(cat => ({ category: cat.slug }))
  } catch (error) {
    console.error('[v0] Error generating static params for categories:', error)
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  
  // Exclude static paths from being treated as categories
  if (EXCLUDED_PATHS.includes(params.category)) {
    return { title: 'LiftGO' }
  }
  
  const category = await getCategoryBySlug(params.category)

  if (!category) {
    return { title: 'LiftGO' }
  }

  const meta = generateCategoryMeta({
    categoryName: category.name,
    categorySlug: category.slug
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

export default async function CategoryPage(props: Props) {
  const params = await props.params
  const category = await getCategoryBySlug(params.category)

  if (!category) {
    notFound()
  }

  // Fetch verified obrtniki for this category
  const obrtniki = await listObrtniki({
    category_id: category.id,
    is_available: true,
    limit: 12
  })

  // Get pricing for schema
  const pricing = getPricingForCategory(params.category)

  // Generate schema markup
  const businessSchema = generateLocalBusinessSchema({
    categoryName: category.name,
    cityName: 'Sloveniji',
    obrtnikCount: obrtniki.length,
    avgRating: obrtniki.length > 0
      ? obrtniki.reduce((sum, o) => sum + (o.avg_rating || 0), 0) / obrtniki.length
      : 0
  })

  const serviceSchema = generateServiceSchema({
    categoryName: category.name,
    cityName: 'Slovenija',
    description: 'Preverjeni ' + category.name.toLowerCase() + ' mojstri s hirim odzivom in ocenami strank.',
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
        { name: category.name, href: '/' + params.category }
      ]} />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              {category.name} v Sloveniji
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              Najdite preverjenega {category.name.toLowerCase()} mojstra v vaši okolici. 
              {obrtniki.length}+ aktivnih mojstrov.
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
              Preverjeni {category.name.toLowerCase()} mojstri
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
                  Bodite prvi {category.name.toLowerCase()} mojster v tej kategoriji
                </p>
                <Link href="/za-obrtnike">
                  <Button variant="outline" size="lg">
                    Postani partnerski mojster
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* How it Works */}
        <section className="py-12 md:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">
              Kako najti {category.name.toLowerCase()} mojstra
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Opiši delo', desc: 'Napiši podrobnosti svojega projekt' },
                { step: 2, title: 'Prejmi ponudbe', desc: 'Preverjeni mojstri ti pošljejo ponudbe' },
                { step: 3, title: 'Izberi mojstra', desc: 'Izberi najboljšo ponudbo in dogovori se' }
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection 
          categoryName={category.name}
          categorySlug={params.category}
        />

        {/* Related Cities */}
        <RelatedCities
          categorySlug={params.category}
          categoryName={category.name}
        />

        {/* Related Categories */}
        <RelatedCategories
          currentCategorySlug={params.category}
        />
      </main>
    </>
  )
}
