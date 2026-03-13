import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, MapPin, ArrowLeft, Briefcase } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { getObrtnikiById, getObrtnikiPovprasevanja } from '@/lib/dal/obrtniki'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const obrtnik = await getObrtnikiById(params.id)

  if (!obrtnik) {
    return { title: 'LiftGO' }
  }

  return {
    title: `${obrtnik.business_name} | LiftGO`,
    description: `${obrtnik.description || 'Preverjeni obrtnik'} — Ocene: ${obrtnik.avg_rating.toFixed(1)}/5`,
    keywords: `${obrtnik.business_name}, ${obrtnik.profiles.location_city}, obrtnik`,
    openGraph: {
      title: `${obrtnik.business_name} | LiftGO`,
      description: obrtnik.description || 'Preverjeni obrtnik',
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO',
    },
  }
}

export default async function ObrtnikProfilePage(props: Props) {
  const params = await props.params
  const obrtnik = await getObrtnikiById(params.id)

  if (!obrtnik) {
    notFound()
  }

  // Fetch povprasevanja for this obrtnik
  const povprasevanja = await getObrtnikiPovprasevanja(params.id)

  // Generate schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'LocalBusiness'],
    'name': obrtnik.business_name,
    'areaServed': {
      '@type': 'City',
      'name': obrtnik.profiles.location_city || 'Slovenija',
      'addressCountry': 'SI',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': obrtnik.avg_rating.toFixed(1),
      'bestRating': '5',
      'worstRating': '1',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <Breadcrumb
        items={[
          { name: 'Domov', href: '/' },
          { name: 'Katalog mojstrov', href: '/mojstri' },
          { name: obrtnik.business_name, href: `/obrtniki/${obrtnik.id}` },
        ]}
      />

      <main className="min-h-screen bg-slate-50">
        {/* Header */}
        <section className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href="/mojstri" className="inline-flex items-center gap-2 text-blue-600 mb-6 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Nazaj na katalog
            </Link>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {obrtnik.business_name.charAt(0)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{obrtnik.business_name}</h1>
                <p className="text-slate-600 mb-4">{obrtnik.profiles.full_name}</p>

                {/* Rating */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(obrtnik.avg_rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-lg">{obrtnik.avg_rating.toFixed(1)}</span>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-3 text-sm mb-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    {obrtnik.profiles.location_city || 'Slovenija'}
                    {obrtnik.profiles.location_region && `, ${obrtnik.profiles.location_region}`}
                  </div>
                </div>

                {/* Subscription Tier Badge */}
                <Badge className="mb-6" variant={obrtnik.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                  {obrtnik.subscription_tier === 'pro' ? '⭐ Pro' : 'Start'}
                </Badge>

                {/* CTA Button */}
                <Link href="/novo-povprasevanje">
                  <Button size="lg">
                    Pošlji povpraševanje
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        {obrtnik.description && (
          <section className="py-12 bg-white border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">O podjetju</h2>
              <p className="text-slate-700 leading-relaxed">{obrtnik.description}</p>
            </div>
          </section>
        )}


      </main>
    </>
  )
}
