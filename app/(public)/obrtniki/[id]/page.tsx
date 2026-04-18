import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, MapPin, ArrowLeft, Briefcase, Phone, Mail, Globe, Facebook, Instagram, AlertCircle } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { getObrtnikiById, getObrtnikiPovprasevanja } from '@/lib/dal/obrtniki'
import { createClient } from '@/lib/supabase/client'

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

async function getPortfolioItems(obrtnikId: string) {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('portfolio_items')
      .select('id, title, image_url, created_at')
      .eq('obrtnik_id', obrtnikId)
      .order('created_at', { ascending: false })
      .limit(6)
    return data || []
  } catch (error) {
    console.error('Error fetching portfolio:', error)
    return []
  }
}

async function getReviews(obrtnikId: string) {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('ocene')
      .select(`
        id,
        rating,
        rating_quality,
        rating_punctuality,
        rating_value,
        comment,
        created_at,
        profiles!ocene_narocnik_id_fkey(full_name)
      `)
      .eq('obrtnik_id', obrtnikId)
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return []
  }
}

export default async function ObrtnikProfilePage(props: Props) {
  const params = await props.params
  const obrtnik = await getObrtnikiById(params.id)

  if (!obrtnik) {
    notFound()
  }

  const [portfolioItems, reviews] = await Promise.all([
    getPortfolioItems(params.id),
    getReviews(params.id),
  ])

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
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold">{obrtnik.business_name}</h1>
                  {obrtnik.is_verified && (
                    <Badge className="bg-green-100 text-green-800">✓ Verificiran</Badge>
                  )}
                </div>
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
                  <span className="text-slate-500">({obrtnik.number_of_ratings} ocen)</span>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <div className="text-slate-500">Lokacija</div>
                    <div className="font-semibold">{obrtnik.profiles.location_city || 'Slovenija'}</div>
                  </div>
                  {obrtnik.hourly_rate && (
                    <div>
                      <div className="text-slate-500">Urna postavka</div>
                      <div className="font-semibold">€{obrtnik.hourly_rate}/h</div>
                    </div>
                  )}
                  {obrtnik.years_experience && (
                    <div>
                      <div className="text-slate-500">Izkušnje</div>
                      <div className="font-semibold">{obrtnik.years_experience} let</div>
                    </div>
                  )}
                </div>

                {/* Subscription Tier Badge */}
                <Badge className="mb-6 mr-2" variant={obrtnik.subscription_tier === 'start' ? 'secondary' : 'default'}>
                  {obrtnik.subscription_tier === 'elite'
                    ? '💎 Elite'
                    : obrtnik.subscription_tier === 'pro'
                      ? '⭐ Pro'
                      : 'Start'}
                </Badge>

                {/* CTA Button */}
                <Link href="/novo-povprasevanje">
                  <Button size="lg" className="w-full md:w-auto">
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

        {/* Contact & Details Section */}
        <section className="py-12 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Kontakt in podrobnosti</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Cards */}
              <div className="space-y-3">
                {obrtnik.profiles.phone && (
                  <a href={`tel:${obrtnik.profiles.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>{obrtnik.profiles.phone}</span>
                  </a>
                )}
                
                {obrtnik.profiles.email && (
                  <a href={`mailto:${obrtnik.profiles.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="break-all">{obrtnik.profiles.email}</span>
                  </a>
                )}
                
                {obrtnik.website_url && (
                  <a href={obrtnik.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{obrtnik.website_url}</span>
                  </a>
                )}
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                {obrtnik.facebook_url && (
                  <a href={obrtnik.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>Facebook</span>
                  </a>
                )}
                
                {obrtnik.instagram_url && (
                  <a href={obrtnik.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <Instagram className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>Instagram</span>
                  </a>
                )}

                {obrtnik.service_radius_km && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>Deluje v polmeru: {obrtnik.service_radius_km} km</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        {portfolioItems.length > 0 && (
          <section className="py-12 bg-white border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {portfolioItems.map((item: { id: string; title: string; image_url: string | null; created_at: string }) => (
                  <div key={item.id} className="rounded-lg overflow-hidden bg-slate-100 aspect-square flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Briefcase className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="py-12 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Ocene naročnikov</h2>
            
            {reviews.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Še brez ocen. Bodite prvi, ki oceni tega obrtnika!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{review.profiles?.full_name || 'Anonimno'}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(review.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">
                        {new Date(review.created_at).toLocaleDateString('sl-SI')}
                      </span>
                    </div>

                    {review.comment && <p className="text-slate-700 mb-3">{review.comment}</p>}

                    {/* Sub-ratings */}
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t">
                      {review.rating_quality && (
                        <div>
                          <div className="text-slate-500">Kakovost</div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < Math.floor(review.rating_quality)
                                    ? 'bg-yellow-400'
                                    : 'bg-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {review.rating_punctuality && (
                        <div>
                          <div className="text-slate-500">Točnost</div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < Math.floor(review.rating_punctuality)
                                    ? 'bg-yellow-400'
                                    : 'bg-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {review.rating_value && (
                        <div>
                          <div className="text-slate-500">Vrednost</div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < Math.floor(review.rating_value)
                                    ? 'bg-yellow-400'
                                    : 'bg-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-12 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Zainteresirani ste?</h2>
            <p className="text-slate-600 mb-6">Pošljite povpraševanje in dobite ponudbo</p>
            <Link href="/novo-povprasevanje">
              <Button size="lg">
                Pošlji povpraševanje
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
