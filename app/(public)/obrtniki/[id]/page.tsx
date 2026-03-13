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

  const specialnosti = obrtnik.specialnosti?.join(', ') || 'Storitve'
  const lokacija = obrtnik.lokacije?.[0] || 'Slovenija'

  return {
    title: `${obrtnik.podjetje || `${obrtnik.ime} ${obrtnik.priimek}`} — ${specialnosti} | LiftGO`,
    description: `${obrtnik.bio || 'Preverjeni obrtnik'} — Ocene: ${obrtnik.ocena.toFixed(1)}/5`,
    keywords: `${obrtnik.podjetje || obrtnik.ime}, ${specialnosti}, ${lokacija}, obrtnik`,
    openGraph: {
      title: `${obrtnik.podjetje || obrtnik.ime} | LiftGO`,
      description: obrtnik.bio || 'Preverjeni obrtnik',
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
  const displayName = obrtnik.podjetje || `${obrtnik.ime} ${obrtnik.priimek}`
  const specialnosti = obrtnik.specialnosti?.join(', ') || 'Storitve'
  const lokacija = obrtnik.lokacije?.[0] || 'Slovenija'

  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'LocalBusiness'],
    'name': displayName,
    'jobTitle': specialnosti,
    'areaServed': {
      '@type': 'City',
      'name': lokacija,
      'addressCountry': 'SI',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': obrtnik.ocena.toFixed(1),
      'reviewCount': obrtnik.stevilo_ocen,
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
          { name: displayName, href: `/obrtniki/${obrtnik.id}` },
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
                {obrtnik.profilna_slika_url ? (
                  <img
                    src={obrtnik.profilna_slika_url}
                    alt={displayName}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {obrtnik.ime.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
                <p className="text-slate-600 mb-4">{specialnosti}</p>

                {/* Rating */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(obrtnik.ocena)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-lg">{obrtnik.ocena.toFixed(1)}</span>
                  <span className="text-slate-600">({obrtnik.stevilo_ocen} ocen)</span>
                </div>

                {/* Location & Experience */}
                <div className="flex flex-col gap-3 text-sm mb-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    {lokacija}
                  </div>
                  {obrtnik.leta_izkusenj && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                      {obrtnik.leta_izkusenj}+ let izkušenj
                    </div>
                  )}
                </div>

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
        {obrtnik.bio && (
          <section className="py-12 bg-white border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">O mojstru</h2>
              <p className="text-slate-700 leading-relaxed">{obrtnik.bio}</p>
            </div>
          </section>
        )}

        {/* Specialnosti Section */}
        {obrtnik.specialnosti && obrtnik.specialnosti.length > 0 && (
          <section className="py-12">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">Specialnosti</h2>
              <div className="flex flex-wrap gap-2">
                {obrtnik.specialnosti.map((spec, idx) => (
                  <Badge key={idx} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lokacije Section */}
        {obrtnik.lokacije && obrtnik.lokacije.length > 0 && (
          <section className="py-12 bg-white border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">Pokrivana območja</h2>
              <div className="flex flex-wrap gap-2">
                {obrtnik.lokacije.map((lok, idx) => (
                  <Badge key={idx} variant="outline">
                    {lok}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Requests Section */}
        {povprasevanja.length > 0 && (
          <section className="py-12 border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">Nedavna povpraševanja</h2>
              <div className="space-y-3">
                {povprasevanja.slice(0, 5).map((pov) => (
                  <Card key={pov.id} className="p-4">
                    <p className="font-medium text-slate-900">{pov.storitev}</p>
                    <p className="text-sm text-slate-600">{pov.lokacija}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Status: <Badge variant="outline">{pov.status}</Badge>
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  )
}
