import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Star, MapPin, CheckCircle, Zap, Clock, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { ProfileTabs } from '@/components/obrtnik/ProfileTabs'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const supabase = await createClient()

  const { data: obrtnik } = await supabase
    .from('obrtnik_profiles')
    .select('business_name, description, avg_rating, total_reviews, profiles!inner(full_name, location_city)')
    .eq('id', params.id)
    .eq('is_verified', true)
    .single()

  if (!obrtnik) {
    return { title: 'LiftGO' }
  }

  return {
    title: `${obrtnik.business_name} | LiftGO`,
    description: obrtnik.description || `${obrtnik.business_name} - Preverjeni obrtnik na LiftGO. Ocene: ${obrtnik.avg_rating}/5`,
  }
}

export default async function ObrtnikiProfilePage(props: Props) {
  const params = await props.params
  const supabase = await createClient()

  const { data: obrtnik, error } = await supabase
    .from('obrtnik_profiles')
    .select(`
      id, business_name, description, tagline, is_verified, avg_rating, total_reviews,
      is_available, subscription_tier, hourly_rate, service_radius_km,
      years_experience, working_since, response_time_hours, website_url,
      portfolio_cover_url, ajpes_id,
      profiles!inner(full_name, first_name, last_name, avatar_url, location_city, location_region, phone),
      portfolio_items(id, title, image_urls, category, completed_at, price_approx, is_featured, sort_order),
      ocene(id, rating, quality_rating, punctuality_rating, price_rating, comment, photos,
            obrtnik_reply, replied_at, created_at,
            profiles!narocnik_id(first_name, last_name)),
      obrtnik_categories(categories(name, slug, icon_name)),
      obrtnik_availability(day_of_week, time_from, time_to, is_available),
      service_areas(city, region, radius_km)
    `)
    .eq('id', params.id)
    .eq('is_verified', true)
    .single()

  if (error || !obrtnik) {
    notFound()
  }

  const profile = obrtnik.profiles as any
  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const categories = (obrtnik.obrtnik_categories as any[])?.map(cat => cat.categories.name) || []
  const portfolioItems = (obrtnik.portfolio_items as any[]) || []
  const reviews = (obrtnik.ocene as any[]) || []

  return (
    <main className="min-h-screen bg-white">
      <Breadcrumb
        items={[
          { name: 'Domov', href: '/' },
          { name: 'Katalog mojstrov', href: '/mojstri' },
          { name: obrtnik.business_name, href: `/mojstri/${obrtnik.id}` },
        ]}
      />

      {/* Hero Section */}
      <section className="border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex gap-6 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#0F3460] flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>

            {/* Header Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{obrtnik.business_name}</h1>
                  {obrtnik.tagline && <p className="text-gray-500 text-sm">{obrtnik.tagline}</p>}
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mb-4">
                {obrtnik.is_verified && (
                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Preverjen
                  </Badge>
                )}
                {obrtnik.subscription_tier === 'pro' && (
                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                    <Zap className="w-3 h-3 mr-1" />
                    PRO
                  </Badge>
                )}
                {obrtnik.is_available && (
                  <Badge className="bg-green-50 text-green-700 hover:bg-green-100">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1" />
                    Na voljo
                  </Badge>
                )}
              </div>

              {/* Rating and Stats */}
              <div className="flex flex-wrap gap-6 items-center mb-4">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
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
                  <span className="text-gray-600 text-sm">({obrtnik.total_reviews} ocen)</span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {profile.location_city}
                    {profile.location_region && `, ${profile.location_region}`}
                  </span>
                </div>

                {/* Experience */}
                {obrtnik.years_experience && (
                  <span className="text-gray-600">
                    {obrtnik.years_experience}+ let izkušenj
                  </span>
                )}

                {/* Hourly Rate */}
                {obrtnik.hourly_rate && (
                  <span className="text-gray-600 font-medium">
                    od {obrtnik.hourly_rate}€/uro
                  </span>
                )}
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Sidebar on Desktop */}
          <div className="lg:absolute lg:top-32 lg:right-4 lg:w-72 space-y-4">
            <Button className="w-full" size="lg" asChild>
              <a href={`/povprasevanje/novo?obrtnik_id=${obrtnik.id}`}>
                Pošlji povpraševanje
              </a>
            </Button>
            {profile.phone && (
              <Button variant="outline" className="w-full" size="lg" asChild>
                <a href={`tel:${profile.phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Pokliči
                </a>
              </Button>
            )}
            {obrtnik.response_time_hours && (
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    Odziv: ~{obrtnik.response_time_hours}h
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <ProfileTabs
          obrtnik={obrtnik}
          portfolioItems={portfolioItems}
          reviews={reviews}
          serviceAreas={obrtnik.service_areas || []}
          availability={obrtnik.obrtnik_availability || []}
        />
      </section>
    </main>
  )
}
