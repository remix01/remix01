import { getObrtnikiById } from '@/lib/dal/obrtniki'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Phone, Globe, Facebook, Instagram, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface PageProps {
  params: {
    id: string
  }
}

interface PortfolioItem {
  id: string
  title: string
  description: string | null
  image_urls: string[]
  completed_at: string
}

interface ServiceArea {
  city: string
  region: string | null
  radius_km: number
  is_active: boolean
}

interface Review {
  id: string
  rating: number
  quality_rating: number | null
  punctuality_rating: number | null
  price_rating: number | null
  comment: string | null
  replied_at: string | null
  profiles: {
    full_name: string
  }
}

const RatingStars = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const months = [
    'januarja',
    'februarja',
    'marca',
    'aprila',
    'maja',
    'junija',
    'julija',
    'avgusta',
    'septembra',
    'oktobra',
    'novembra',
    'decembra',
  ]
  return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`
}

export default async function ObrtnikiProfilePage({ params }: PageProps) {
  const obrtnik = await getObrtnikiById(params.id)

  if (!obrtnik) {
    notFound()
  }

  // Fetch portfolio items
  const supabase = await createClient()
  const { data: portfolioItems = [] } = await supabase
    .from('portfolio_items')
    .select('id, title, description, image_urls, completed_at')
    .eq('obrtnik_id', params.id)
    .order('sort_order', { ascending: true })
    .limit(12) as any

  // Fetch service areas
  const { data: serviceAreas = [] } = await supabase
    .from('service_areas')
    .select('city, region, radius_km, is_active')
    .eq('obrtnik_id', params.id)
    .eq('is_active', true) as any

  // Fetch reviews (public only)
  const { data: reviews = [] } = await supabase
    .from('ocene')
    .select('id, rating, quality_rating, punctuality_rating, price_rating, comment, replied_at, profiles(full_name)')
    .eq('obrtnik_id', params.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(5) as any

  // Fetch categories
  const { data: categoryData = [] } = await supabase
    .from('obrtnik_categories')
    .select('categories(name)')
    .eq('obrtnik_id', params.id)
    .limit(5) as any

  const categories = categoryData.map((item: any) => item.categories?.name).filter(Boolean)

  // Additional profile fields
  const { data: fullProfile } = await supabase
    .from('obrtnik_profiles')
    .select('hourly_rate, years_experience, response_time_hours, tagline, website_url, facebook_url, instagram_url')
    .eq('id', params.id)
    .maybeSingle() as any

  const businessHours = fullProfile?.response_time_hours
  const hourlyRate = fullProfile?.hourly_rate
  const yearsExperience = fullProfile?.years_experience
  const tagline = fullProfile?.tagline
  const websiteUrl = fullProfile?.website_url
  const facebookUrl = fullProfile?.facebook_url
  const instagramUrl = fullProfile?.instagram_url

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-4xl">
              {obrtnik.business_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-bold text-foreground">{obrtnik.business_name}</h1>
                {obrtnik.subscription_tier === 'pro' && (
                  <Badge className="bg-amber-100 text-amber-700">⭐ PRO</Badge>
                )}
                {obrtnik.is_verified && (
                  <Badge className="bg-green-100 text-green-700">✓ Verificiran</Badge>
                )}
              </div>

              {/* Tagline or category */}
              {tagline ? (
                <p className="text-lg text-muted-foreground mb-4">{tagline}</p>
              ) : categories.length > 0 ? (
                <p className="text-lg text-muted-foreground mb-4">{categories.join(', ')}</p>
              ) : null}

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <RatingStars rating={obrtnik.avg_rating} />
                  <span className="font-bold text-lg">{obrtnik.avg_rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? 'ocena' : 'ocen'})
                  </span>
                </div>
              </div>

              {/* Location */}
              {obrtnik.profiles.location_city && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{obrtnik.profiles.location_city}</span>
                  {obrtnik.profiles.location_region && (
                    <span>, {obrtnik.profiles.location_region}</span>
                  )}
                </div>
              )}

              {/* Hourly rate and experience */}
              <div className="flex flex-col sm:flex-row gap-4 text-sm">
                {hourlyRate ? (
                  <div className="font-semibold text-foreground">
                    {hourlyRate}€/uro
                  </div>
                ) : (
                  <div className="text-muted-foreground">Cena po dogovoru</div>
                )}
                {yearsExperience && (
                  <div className="text-muted-foreground">
                    {yearsExperience} {yearsExperience === 1 ? 'leto' : 'let'} izkušenj
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div className="w-full sm:w-auto">
              <Link href={`/povprasevanja/novo?obrtnik_id=${params.id}`}>
                <Button size="lg" className="w-full sm:w-auto h-12 gap-2">
                  Pošlji povpraševanje <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {businessHours && (
                <p className="text-xs text-muted-foreground mt-2 text-center sm:text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Odziv v {businessHours}h
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Description */}
        {obrtnik.description && (
          <Card className="mb-12 p-6">
            <h2 className="text-2xl font-bold mb-4">O podjetju</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{obrtnik.description}</p>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="mb-12 p-6">
          <h2 className="text-2xl font-bold mb-6">Kontakt in povezave</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {obrtnik.profiles.phone && (
              <a
                href={`tel:${obrtnik.profiles.phone}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition"
              >
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{obrtnik.profiles.phone}</span>
              </a>
            )}
            {obrtnik.profiles.email && (
              <a
                href={`mailto:${obrtnik.profiles.email}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition"
              >
                <span className="text-sm font-medium">Email</span>
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition"
              >
                <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Spletna stran</span>
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition"
              >
                <Facebook className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Facebook</span>
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition"
              >
                <Instagram className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Instagram</span>
              </a>
            )}
          </div>
        </Card>

        {/* Service Areas */}
        {serviceAreas.length > 0 && (
          <Card className="mb-12 p-6">
            <h2 className="text-2xl font-bold mb-4">Področje storitev</h2>
            <div className="flex flex-wrap gap-3">
              {serviceAreas.map((area, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm px-3 py-2">
                  {area.city} ({area.radius_km}km)
                  {area.region && `, ${area.region}`}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Portfolio Section */}
        <Card className="mb-12 p-6">
          <h2 className="text-2xl font-bold mb-6">Referenčna dela</h2>
          {portfolioItems.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Ta obrtnik še ni dodal referenčnih del</p>
              {obrtnik.id && (
                <Link href="/partner-dashboard/account">
                  <Button variant="outline" size="sm">
                    Ste ta obrtnik? Dodajte dela →
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioItems.map((item: PortfolioItem) => (
                <div key={item.id} className="group rounded-lg overflow-hidden bg-muted">
                  {item.image_urls?.[0] && (
                    <div className="relative w-full h-40 overflow-hidden bg-gray-200">
                      <Image
                        src={item.image_urls[0]}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.completed_at && (
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(item.completed_at)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Reviews Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Ocene</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Še brez ocen. Bodite prvi!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review: Review) => (
                <div key={review.id} className="pb-6 border-b last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">
                        {review.profiles.full_name.split(' ')[0]}{' '}
                        {review.profiles.full_name.split(' ')[1]?.[0]}.
                      </p>
                      <RatingStars rating={review.rating} size="sm" />
                    </div>
                  </div>

                  {/* Sub-ratings */}
                  {(review.quality_rating || review.punctuality_rating || review.price_rating) && (
                    <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                      {review.quality_rating && <span>Kakovost: {review.quality_rating}/5</span>}
                      {review.punctuality_rating && <span>Točnost: {review.punctuality_rating}/5</span>}
                      {review.price_rating && <span>Vrednost: {review.price_rating}/5</span>}
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && <p className="text-sm text-muted-foreground line-clamp-4">{review.comment}</p>}

                  {/* Reply */}
                  {review.replied_at && (
                    <div className="bg-primary/5 border-l-4 border-primary p-3 mt-3 rounded text-sm">
                      <p className="font-semibold text-xs text-primary mb-1">Odgovor mojstra:</p>
                      <p className="text-muted-foreground text-xs">Odgovoreno {formatDate(review.replied_at)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
