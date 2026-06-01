import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_TRANSLATIONS,
  AUSTRIAN_CITIES,
  getSlSlugFromLocale,
  getCityBySlugForLocale,
  buildSeoContentDe,
  generateLocaleMeta,
} from '@/lib/seo/i18n'
import { generateFAQSchema } from '@/lib/seo/meta'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'

interface Props {
  params: Promise<{ category: string; city: string }>
}

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  const params: { category: string; city: string }[] = []
  for (const t of Object.values(CATEGORY_TRANSLATIONS)) {
    for (const city of AUSTRIAN_CITIES) {
      params.push({ category: t.de.slug, city: city.slug })
    }
  }
  return params
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category: categorySlug, city: citySlug } = await props.params
  const slSlug = getSlSlugFromLocale(categorySlug, 'de')
  if (!slSlug) return { title: 'LiftGO' }

  const translation = CATEGORY_TRANSLATIONS[slSlug].de
  const city = getCityBySlugForLocale(citySlug, 'de')
  if (!city) return { title: 'LiftGO' }

  const meta = generateLocaleMeta({ categoryName: translation.name, cityName: city.name, locale: 'de' })

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://liftgo.net/de/${categorySlug}/${citySlug}`,
      languages: {
        'sl-SI': `https://liftgo.net/${slSlug}`,
        'de-AT': `https://liftgo.net/de/${categorySlug}/${citySlug}`,
        'x-default': `https://liftgo.net/${slSlug}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
      locale: 'de_AT',
      siteName: 'LiftGO',
      url: `https://liftgo.net/de/${categorySlug}/${citySlug}`,
    },
  }
}

function getNearbyCities(region: string, currentSlug: string) {
  return AUSTRIAN_CITIES.filter(c => c.region === region && c.slug !== currentSlug).slice(0, 5)
}

export default async function DeKategorieStadtPage(props: Props) {
  const { category: categorySlug, city: citySlug } = await props.params
  const slSlug = getSlSlugFromLocale(categorySlug, 'de')
  if (!slSlug) notFound()

  const translation = CATEGORY_TRANSLATIONS[slSlug!].de
  const cityOrNull = getCityBySlugForLocale(citySlug, 'de')
  if (!cityOrNull) notFound()
  const city = cityOrNull!

  const seoContent = buildSeoContentDe({
    categoryName: translation.name,
    categorySlug,
    cityName: city.name,
  })
  const pricing = getPricingForCategory(slSlug!)
  const nearbyCities = getNearbyCities(city.region, citySlug)

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${translation.name} in ${city.name}`,
    description: seoContent.schemaDescription,
    areaServed: { '@type': 'City', name: city.name, addressCountry: 'AT' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: pricing.minHourly,
      highPrice: pricing.maxHourly,
    },
    provider: { '@type': 'Organization', name: 'LiftGO', url: 'https://liftgo.net' },
  }

  const faqSchema = generateFAQSchema(
    seoContent.faqItems,
    `https://liftgo.net/de/${categorySlug}/${citySlug}`,
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-4 py-3 text-sm text-gray-500">
        <ol className="flex gap-2 flex-wrap">
          <li><Link href="/" className="hover:underline">Start</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/de" className="hover:underline">Österreich</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/de/${categorySlug}`} className="hover:underline">{translation.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{city.name}</li>
        </ol>
      </nav>

      <main className="min-h-screen">
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              {translation.name} in {city.name}
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              {seoContent.categoryIntro}
            </p>
            <Link href="/novo-povprasevanje">
              <Button size="lg" className="gap-2">
                Kostenlose Anfrage stellen <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-10 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-4">
              {translation.name} in {city.name} — was Sie erwarten können
            </h2>
            <p className="text-gray-700 max-w-4xl mb-6">{seoContent.whatToExpect}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/de/${categorySlug}`} className="underline text-blue-700">
                Zurück zu {translation.name} in Österreich
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 bg-gray-50 text-center">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-4">LiftGO expandiert nach Österreich</h2>
            <p className="text-gray-600 mb-6">
              Sind Sie Handwerker in {city.name}? Registrieren Sie sich jetzt und erhalten Sie als Erster Anfragen in Ihrer Region.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/za-obrtnike">
                <Button size="lg">Als Handwerker registrieren</Button>
              </Link>
              <Link href="/novo-povprasevanje">
                <Button variant="outline" size="lg">Anfrage stellen</Button>
              </Link>
            </div>
          </div>
        </section>

        {nearbyCities.length > 0 && (
          <section className="py-12 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">
                {translation.name} in Nachbarstädten
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {nearbyCities.map(nearbyCity => (
                  <Link
                    key={nearbyCity.slug}
                    href={`/de/${categorySlug}/${nearbyCity.slug}`}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow text-center"
                  >
                    <p className="font-medium text-sm">{nearbyCity.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">Häufig gestellte Fragen</h2>
            <div className="space-y-4">
              {seoContent.faqItems.map((item, i) => (
                <div key={i} className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                  <h3 className="font-semibold mb-3 text-lg">{item.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
