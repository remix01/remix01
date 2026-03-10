import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, MapPin, CheckCircle, ArrowLeft, Clock } from 'lucide-react'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { PortfolioGallery } from '@/components/portfolio/PortfolioGallery'
import { ReviewCard } from '@/components/portfolio/ReviewCard'
import { RatingDisplay } from '@/components/portfolio/RatingDisplay'
import { ServicesList } from '@/components/portfolio/ServicesList'
import { getPublicObrtnikProfile } from '@/lib/dal/partners'
import { getObrtnikReviews, getObrtnikReviewStats } from '@/lib/dal/reviews'
import { getObrtnikPortfolio } from '@/lib/dal/portfolio'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const obrtnik = await getPublicObrtnikProfile(params.id)

  if (!obrtnik) {
    return { title: 'LiftGO' }
  }

  const categoryNames = obrtnik.categories?.map(c => c.name).join(', ') || 'Storitve'

  return {
    title: `${obrtnik.business_name} — ${categoryNames} v ${obrtnik.profile?.location_city} | LiftGO`,
    description: `${obrtnik.description || obrtnik.business_name} — Prevereni obrtnik na LiftGO. Ocene: ${obrtnik.avg_rating.toFixed(1)}/5`,
    keywords: `${obrtnik.business_name}, ${categoryNames}, ${obrtnik.profile?.location_city}, obrtnik`,
    openGraph: {
      title: `${obrtnik.business_name} | LiftGO`,
      description: `${obrtnik.description || 'Preverjeni obrtnik'}`,
      type: 'website',
      locale: 'sl_SI',
      siteName: 'LiftGO',
    },
  }
}

export default async function ObrtnikProfilePage(props: Props) {
  const params = await props.params
  const obrtnik = await getPublicObrtnikProfile(params.id)

  if (!obrtnik) {
    notFound()
  }

  // Fetch additional data
  const [reviews, reviewStats, portfolioImages] = await Promise.all([
    getObrtnikReviews(params.id, 5),
    getObrtnikReviewStats(params.id),
    getObrtnikPortfolio(params.id),
  ])

  // Generate schema
  const categoryNames = obrtnik.categories?.map(c => c.name).join(', ') || 'Storitve'
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'LocalBusiness'],
    'name': obrtnik.business_name,
    'jobTitle': categoryNames,
    'areaServed': {
      '@type': 'City',
      'name': obrtnik.profile?.location_city,
      'addressCountry': 'SI',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': obrtnik.avg_rating.toFixed(1),
      'reviewCount': obrtnik.total_reviews,
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

      <Breadcrumb items={[
        { name: 'Domov', href: '/' },
        { name: 'Katalog mojstrov', href: '/mojstri' },
        { name: obrtnik.business_name, href: `/obrtniki/${obrtnik.id}` },
      ]} />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <section className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href={-1 as any} className="inline-flex items-center gap-2 text-blue-600 mb-6 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Nazaj
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {obrtnik.business_name}
                    </h1>
                    <p className="text-gray-600 mb-4">{categoryNames}</p>
                  </div>
                  {obrtnik.is_verified && (
                    <div className="flex items-center gap-1 bg-green-50 px-3 py-2 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Preverjen</span>
                    </div>
                  )}
                </div>

                {/* Rating and Reviews */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(obrtnik.avg_rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-lg">{obrtnik.avg_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-gray-600">({obrtnik.total_reviews} ocen)</span>
                  {obrtnik.response_time_hours && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      Odgovori v {obrtnik.response_time_hours}h
                    </div>
                  )}
                </div>

                {/* Availability */}
                {obrtnik.is_available && (
                  <Badge className="mb-6 bg-green-50 text-green-700 hover:bg-green-100">
                    Dostopen
                  </Badge>
                )}

                {/* Location & Contact */}
                <div className="flex flex-col gap-3 text-sm mb-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    {obrtnik.profile?.location_city}, Slovenija
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  <Link href="/narocnik/novo-povprasevanje">
                    <Button size="lg">
                      Pošlji povpraševanje
                    </Button>
                  </Link>
                  <a href={`tel:${obrtnik.phone}`}>
                    <Button variant="outline" size="lg">
                      Pokliči
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">O mojstru</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {obrtnik.description || 'Izkušen in preverjeni obrtnik.'}
            </p>
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Storitve</h3>
              {obrtnik.categories && obrtnik.categories.length > 0 ? (
                <ServicesList services={obrtnik.categories} />
              ) : (
                <p className="text-gray-500 text-sm">Storitve niso navedene.</p>
              )}
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        {portfolioImages.length > 0 && (
          <section className="py-12 bg-white border-t">
            <div className="max-w-4xl mx-auto px-4">
              <PortfolioGallery
                images={portfolioImages.map((img) => ({
                  id: img.id,
                  url: img.url,
                  title: img.title,
                  description: img.description,
                }))}
                title="Portfelj del"
              />
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="py-12 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">
              Ocene ({reviewStats.total})
            </h2>

            {reviewStats.total > 0 ? (
              <div className="space-y-6">
                {/* Summary */}
                <RatingDisplay
                  average={reviewStats.average}
                  total={reviewStats.total}
                  distribution={reviewStats.distribution}
                />

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Nedavne ocene</h3>
                    <div className="space-y-3">
                      {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Trenutno ni nobene ocene. Bodite prvi, ki ste dali oceno!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
