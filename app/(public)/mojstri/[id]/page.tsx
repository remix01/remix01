'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Phone, Globe, Facebook, Instagram, Calendar, Clock, Badge, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ServiceAreaDisplay, ServiceAreaRow } from '@/lib/types'
import { toServiceAreaDisplayList } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function MojsterDetailPage({ params }: PageProps) {
  const [obrtnik, setObrtnik] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('portfolio')

  const paramsValue = params as any
  const id = paramsValue.id || (params as any).id

  useEffect(() => {
    const loadObrtnik = async () => {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('obrtnik_profiles')
          .select(`
            id, business_name, description, tagline, is_verified, avg_rating,
            total_reviews, is_available, subscription_tier, hourly_rate,
            service_radius_km, years_experience, working_since, response_time_hours,
            website_url, facebook_url, instagram_url, ajpes_id,
            profiles!inner(full_name, first_name, last_name, avatar_url, location_city, location_region, phone),
            portfolio_items(id, title, description, image_urls, category, completed_at, price_approx, is_featured, sort_order),
            ocene(id, rating, quality_rating, punctuality_rating, price_rating, comment, photos,
                  obrtnik_reply, replied_at, created_at,
                  narocnik:profiles!ocene_narocnik_id_fkey(first_name, last_name)),
            obrtnik_categories(categories(name, slug, icon_name)),
            obrtnik_availability(day_of_week, time_from, time_to, is_available),
            service_areas(id, city, region, radius_km, lat, lng, is_active)
          `)
          .eq('id', id)
          .eq('is_verified', true)
          .maybeSingle()

        if (error || !data) {
          notFound()
          return
        }

        // Transform service areas to display type
        const serviceAreasRaw = (data.service_areas as ServiceAreaRow[]) || []
        const transformedServiceAreas: ServiceAreaDisplay[] = toServiceAreaDisplayList(serviceAreasRaw)
        data.service_areas = transformedServiceAreas

        setObrtnik(data)
      } catch (err) {
        console.error('[v0] Error loading obrtnik:', err)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    loadObrtnik()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!obrtnik) {
    notFound()
  }

  const profile = obrtnik.profiles[0]
  const daysOfWeek = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']
  const categories = obrtnik.obrtnik_categories?.map((oc: any) => oc.categories) || []
  const reviews = obrtnik.ocene || []
  const portfolio = obrtnik.portfolio_items || []
  const availability = obrtnik.obrtnik_availability || []

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Avatar */}
            <div className="md:col-span-1">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={200}
                  height={200}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-5xl font-bold">
                  {initials}
                </div>
              )}
            </div>

            {/* Main Info */}
            <div className="md:col-span-3 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {obrtnik.business_name}
                  </h1>
                  {obrtnik.subscription_tier === 'pro' && (
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-lg">{obrtnik.tagline || obrtnik.description}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 py-3 border-y border-border">
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(obrtnik.avg_rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <span className="font-bold text-lg">{obrtnik.avg_rating.toFixed(1)}</span>
                  <span className="text-muted-foreground ml-2">({obrtnik.total_reviews || 0} ocen)</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {profile.location_city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {profile.location_city}
                  </div>
                )}
                <div className="text-foreground font-semibold">
                  {obrtnik.hourly_rate ? `od ${obrtnik.hourly_rate}€/uro` : 'Cena po dogovoru'}
                </div>
                {obrtnik.years_experience ? (
                  <div className="text-muted-foreground">
                    {obrtnik.years_experience} let izkušenj
                  </div>
                ) : null}
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3 pt-4 flex-col sm:flex-row">
                <Link href={`/povprasevanje/novo?obrtnik_id=${id}`} className="flex-1 sm:flex-none">
                  <button className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity min-h-[48px] flex items-center justify-center">
                    Pošlji povpraševanje
                  </button>
                </Link>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex-1 sm:flex-none">
                    <button className="w-full sm:w-auto px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2 min-h-[48px]">
                      <Phone className="w-4 h-4" />
                      Pokliči
                    </button>
                  </a>
                )}
              </div>

              {/* Social Links */}
              {(obrtnik.website_url || obrtnik.facebook_url || obrtnik.instagram_url) && (
                <div className="flex gap-3">
                  {obrtnik.website_url && (
                    <a href={obrtnik.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {obrtnik.facebook_url && (
                    <a href={obrtnik.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {obrtnik.instagram_url && (
                    <a href={obrtnik.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-8 border-b border-border mb-8 overflow-x-auto">
          {['portfolio', 'ocene', 'info', 'urnik'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'portfolio' && 'Portfolio'}
              {tab === 'ocene' && 'Ocene'}
              {tab === 'info' && 'O mojstru'}
              {tab === 'urnik' && 'Pokritost & Urnik'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div>
              {portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {portfolio
                    .sort((a: any) => (a.is_featured ? -1 : 1))
                    .map((item: any) => (
                      <div key={item.id} className="bg-background rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow">
                        {item.image_urls?.[0] && (
                          <Image
                            src={item.image_urls[0]}
                            alt={item.title}
                            width={400}
                            height={300}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.category}</span>
                            {item.completed_at && (
                              <span>{new Date(item.completed_at).getFullYear()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-background rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground">Ta obrtnik še ni dodal referenčnih del</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'ocene' && (
            <div>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="bg-background p-6 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {review.narocnik?.first_name} {review.narocnik?.last_name}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              {review.rating}/5
                            </span>
                            {review.created_at && (
                              <span>{new Date(review.created_at).toLocaleDateString('sl-SI')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-foreground mb-3">{review.comment}</p>
                      )}
                      {review.obrtnik_reply && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm font-semibold text-primary mb-1">Odgovor obrtnika:</p>
                          <p className="text-sm text-foreground">{review.obrtnik_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-background rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground">Ni ocene za tega obrtnika</p>
                </div>
              )}
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {obrtnik.description && (
                <div className="bg-background p-6 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-3">O podjetju</h3>
                  <p className="text-foreground whitespace-pre-wrap">{obrtnik.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background p-6 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-4">Podatki o obrtni</h3>
                  <div className="space-y-2 text-sm">
                    {obrtnik.years_experience ? (
                      <div>
                        <span className="text-muted-foreground">Izkušnje:</span>
                        <p className="font-semibold text-foreground">{obrtnik.years_experience} let</p>
                      </div>
                    ) : null}
                    {obrtnik.working_since && (
                      <div>
                        <span className="text-muted-foreground">Deluje od:</span>
                        <p className="font-semibold text-foreground">{new Date(obrtnik.working_since).getFullYear()}</p>
                      </div>
                    )}
                    {obrtnik.service_radius_km && (
                      <div>
                        <span className="text-muted-foreground">Območje storitev:</span>
                        <p className="font-semibold text-foreground">do {obrtnik.service_radius_km} km</p>
                      </div>
                    )}
                    {obrtnik.response_time_hours && (
                      <div>
                        <span className="text-muted-foreground">Čas odziva:</span>
                        <p className="font-semibold text-foreground">{obrtnik.response_time_hours}h</p>
                      </div>
                    )}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="bg-background p-6 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground mb-4">Kategorije storitev</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'urnik' && (
            <div className="space-y-6">
              {availability.length > 0 ? (
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Dan</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Čas</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map((day, idx) => {
                        const dayData = availability.find((a: any) => a.day_of_week === idx)
                        return (
                          <tr key={idx} className="border-b border-border hover:bg-muted/50">
                            <td className="px-6 py-3 font-medium text-foreground">{day}</td>
                            <td className="px-6 py-3 text-muted-foreground">
                              {dayData
                                ? `${dayData.time_from} - ${dayData.time_to}`
                                : '-'}
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                                  dayData?.is_available
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {dayData?.is_available ? 'Na voljo' : 'Ni na voljo'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-background rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground">Urnik ni dostopen</p>
                </div>
              )}

              {obrtnik.service_areas && obrtnik.service_areas.length > 0 && (
                <div className="bg-background p-6 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-4">Območje storitev</h3>
                  <div className="space-y-2 text-sm">
                    {obrtnik.service_areas.map((area: ServiceAreaDisplay, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-foreground">{area.city || area.region}</span>
                        <span className="text-muted-foreground">do {area.radius_km} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
