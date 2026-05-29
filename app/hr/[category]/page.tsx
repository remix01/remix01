import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_TRANSLATIONS,
  CROATIAN_CITIES,
  getSlSlugFromLocale,
  buildSeoContentHr,
  generateLocaleMeta,
} from '@/lib/seo/i18n'
import { generateFAQSchema } from '@/lib/seo/meta'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'

interface Props {
  params: Promise<{ category: string }>
}

export const revalidate = 3600

export function generateStaticParams() {
  return Object.values(CATEGORY_TRANSLATIONS).map(t => ({ category: t.hr.slug }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category: categorySlug } = await props.params
  const slSlug = getSlSlugFromLocale(categorySlug, 'hr')
  if (!slSlug) return { title: 'LiftGO' }

  const translation = CATEGORY_TRANSLATIONS[slSlug].hr
  const meta = generateLocaleMeta({ categoryName: translation.name, locale: 'hr' })

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://liftgo.net/hr/${categorySlug}`,
      languages: {
        'sl-SI': `https://liftgo.net/${slSlug}`,
        'hr-HR': `https://liftgo.net/hr/${categorySlug}`,
        'x-default': `https://liftgo.net/${slSlug}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
      locale: 'hr_HR',
      siteName: 'LiftGO',
      url: `https://liftgo.net/hr/${categorySlug}`,
    },
  }
}

export default async function HrKategorijaPage(props: Props) {
  const { category: categorySlug } = await props.params
  const slSlug = getSlSlugFromLocale(categorySlug, 'hr')
  if (!slSlug) notFound()

  const translation = CATEGORY_TRANSLATIONS[slSlug!].hr
  const seoContent = buildSeoContentHr({ categoryName: translation.name, categorySlug })
  const pricing = getPricingForCategory(slSlug!)

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${translation.name} u Hrvatskoj`,
    description: seoContent.schemaDescription,
    areaServed: { '@type': 'Country', name: 'Hrvatska', addressCountry: 'HR' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: pricing.minHourly,
      highPrice: pricing.maxHourly,
    },
    provider: { '@type': 'Organization', name: 'LiftGO', url: 'https://liftgo.net' },
  }

  const faqSchema = generateFAQSchema(seoContent.faqItems, `https://liftgo.net/hr/${categorySlug}`)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-4 py-3 text-sm text-gray-500">
        <ol className="flex gap-2 flex-wrap">
          <li><Link href="/" className="hover:underline">Početna</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/hr" className="hover:underline">Hrvatska</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{translation.name}</li>
        </ol>
      </nav>

      <main className="min-h-screen">
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              {translation.name} u Hrvatskoj
            </h1>
            <p className="text-lg text-gray-600 mb-4 max-w-2xl">
              {seoContent.categoryIntro}
            </p>
            <p className="text-base text-gray-600 mb-8 max-w-3xl">
              {seoContent.whatToExpect}
            </p>
            <Link href="/novo-povprasevanje">
              <Button size="lg" className="gap-2">
                Pošalji besplatan upit <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Kako pronaći majstora</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Opišite posao', desc: 'Kratko opišite što trebate' },
                { step: 2, title: 'Primite ponude', desc: 'Provjereni majstori šalju ponude' },
                { step: 3, title: 'Odaberite majstora', desc: 'Odaberite najpovoljniju ponudu' },
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

        <section className="py-12 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">{seoContent.relatedCitiesLabel}</h2>
            <div className="flex flex-wrap gap-3">
              {CROATIAN_CITIES.map(city => (
                <Link
                  key={city.slug}
                  href={`/hr/${categorySlug}/${city.slug}`}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                >
                  {translation.name} {city.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">Često postavljana pitanja</h2>
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
