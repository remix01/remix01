import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generateCategoryMeta, generateLocalBusinessSchema } from '@/lib/seo/meta'
import { getCategoryBySlug } from '@/lib/dal/categories'
import { listObrtniki } from '@/lib/dal/profiles'
import { ObrtnikCard } from '@/components/obrtnik-card'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Props {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  // Fetch all active categories from database
  // This will be called at build time for static generation
  try {
    const { getActiveCategories } = await import('@/lib/dal/categories')
    const categories = await getActiveCategories()
    return categories.map(cat => ({ category: cat.slug }))
  } catch (error) {
    console.error('[v0] Error generating static params for categories:', error)
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
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

  // Generate FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'Koliko stane ' + category.name.toLowerCase() + '?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Cena ' + category.name.toLowerCase() + ' je odvisna od obsega dela. Na LiftGO dobite brezplačne ponudbe od več mojstrov in si lahko izberete najboljšo ceno.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Kako hitro pride ' + category.name.toLowerCase() + ' mojster?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Povprečen čas odziva je 2 uri. Po zavrnitvi povpraševanja boste hitro prejeli ponudbe od preverjenih mojstrov.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Kako preveriti kakovost ' + category.name.toLowerCase() + ' mojstra?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Vsi mojstri na LiftGO so preverjeni in imajo ocene strank. Lahko vidite njihov profil, ocene in reference.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Kaj vključuje ' + category.name.toLowerCase() + ' storitev?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'To je odvisno od mojstra in specifičnega primera. Kontaktirajte mojstre in sprašite za natančne podrobnosti.'
        }
      }
    ]
  }

  const businessSchema = generateLocalBusinessSchema({
    categoryName: category.name,
    cityName: 'Sloveniji',
    obrtnikCount: obrtniki.length,
    avgRating: obrtniki.length > 0
      ? obrtniki.reduce((sum, o) => sum + (o.avg_rating || 0), 0) / obrtniki.length
      : 0
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />

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
        <section className="py-12 md:py-20">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">
              Pogosta vprašanja
            </h2>

            <div className="space-y-6">
              {[
                {
                  q: 'Koliko stane ' + category.name.toLowerCase() + '?',
                  a: 'Cena je odvisna od obsega dela. Na LiftGO dobite brezplačne ponudbe in si izberete najboljšo ceno.'
                },
                {
                  q: 'Kako hitro pride ' + category.name.toLowerCase() + ' mojster?',
                  a: 'Povprečen čas odziva je 2 uri. Hitro prejmate ponudbe od preverjenih mojstrov.'
                },
                {
                  q: 'Kako preveriti kakovost mojstra?',
                  a: 'Vsi mojstri so preverjeni in imajo ocene strank. Lahko vidite njihove profile in reference.'
                },
                {
                  q: 'Kaj vključuje storitev?',
                  a: 'To je odvisno od mojstra. Kontaktirajte mojstre in sprašite za natančne podrobnosti.'
                }
              ].map((item, i) => (
                <div key={i} className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">{item.q}</h3>
                  <p className="text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cities Grid */}
        <section className="py-12 md:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12">
              {category.name} po mestih
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SLOVENIAN_CITIES.map(city => (
                <Link
                  key={city.slug}
                  href={`/${params.category}/${city.slug}`}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow text-center"
                >
                  <p className="font-medium text-sm">
                    {category.name.split(' ')[0]} {city.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
