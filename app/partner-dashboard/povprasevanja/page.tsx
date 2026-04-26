import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, MapPin, Banknote, Clock } from 'lucide-react'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { MobileInquiryFilters } from '@/components/partner/mobile-inquiry-filters'
import { redirect } from 'next/navigation'

interface PovprasevanjePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const matchesBudgetFilter = (min: number | null, max: number | null, budgetFilter: string) => {
  const minValue = min ?? 0
  const maxValue = max ?? minValue

  switch (budgetFilter) {
    case 'do-500':
      return minValue <= 500
    case '500-1500':
      return maxValue >= 500 && minValue <= 1500
    case '1500-plus':
      return maxValue >= 1500
    default:
      return true
  }
}

const matchesUrgencyFilter = (urgency: string | null, createdAt: string, urgencyFilter: string) => {
  if (urgencyFilter === 'nujno' || urgencyFilter === 'ta_teden') {
    return urgency === urgencyFilter
  }

  if (urgencyFilter === 'novo') {
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    return hoursAgo < 2
  }

  return true
}

export default async function PovprasevanjePage({ searchParams }: PovprasevanjePageProps) {
  const resolvedSearchParams = (await searchParams) || {}
  const selectedCategory =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : ''
  const selectedLocation =
    typeof resolvedSearchParams.location === 'string' ? resolvedSearchParams.location : ''
  const selectedUrgency =
    typeof resolvedSearchParams.urgency === 'string' ? resolvedSearchParams.urgency : ''
  const selectedBudget =
    typeof resolvedSearchParams.budget === 'string' ? resolvedSearchParams.budget : ''

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login?redirectTo=/partner-dashboard/povprasevanja')
  }

  // location_city je na povprasevanja tabeli direktno — NE na profiles
  const { data: partner } = await supabase
    .from('obrtnik_profiles')
    .select('subscription_tier, business_name, avg_rating, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  const { data: povprasevanja, error } = await supabase
    .from('povprasevanja')
    .select(`
      id,
      title,
      description,
      status,
      location_city,
      urgency,
      budget_min,
      budget_max,
      created_at,
      category_id,
      categories:category_id(name, icon_name)
    `)
    .eq('status', 'odprto')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[povprasevanja] query error:', error.message)
  }

  const requests = povprasevanja || []

  const categoryCounts = new Map<string, { label: string; count: number }>()
  const locationCounts = new Map<string, { label: string; count: number }>()

  for (const request of requests) {
    const categoryName = (request.categories as any)?.name ?? 'Splošno'
    const categoryKey = categoryName.toLowerCase()
    const existingCategory = categoryCounts.get(categoryKey)
    categoryCounts.set(categoryKey, {
      label: categoryName,
      count: (existingCategory?.count ?? 0) + 1,
    })

    if (request.location_city) {
      const locationKey = request.location_city.toLowerCase()
      const existingLocation = locationCounts.get(locationKey)
      locationCounts.set(locationKey, {
        label: request.location_city,
        count: (existingLocation?.count ?? 0) + 1,
      })
    }
  }

  const categoryOptions = Array.from(categoryCounts.entries())
    .map(([value, data]) => ({ value, label: data.label, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const locationOptions = Array.from(locationCounts.entries())
    .map(([value, data]) => ({ value, label: data.label, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const filteredRequests = requests.filter((request) => {
    const categoryName = ((request.categories as any)?.name ?? 'Splošno').toLowerCase()
    const locationName = request.location_city?.toLowerCase() ?? ''

    if (selectedCategory && categoryName !== selectedCategory) return false
    if (selectedLocation && locationName !== selectedLocation) return false
    if (selectedBudget && !matchesBudgetFilter(request.budget_min, request.budget_max, selectedBudget)) return false
    if (selectedUrgency && !matchesUrgencyFilter(request.urgency, request.created_at, selectedUrgency)) return false

    return true
  })

  // Urgency badge — prioritizira urgency polje iz baze, fallback na starost
  const getUrgencyBadge = (urgency: string | null, createdAt: string) => {
    if (urgency === 'nujno') return { label: 'Nujno', color: 'bg-red-100 text-red-800' }
    if (urgency === 'ta_teden') return { label: 'Ta teden', color: 'bg-orange-100 text-orange-800' }
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 2) return { label: 'Novo', color: 'bg-blue-100 text-blue-800' }
    if (hoursAgo < 24) return { label: 'Danes', color: 'bg-green-100 text-green-800' }
    return { label: 'Odprto', color: 'bg-gray-100 text-gray-800' }
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `${min.toLocaleString('sl-SI')} – ${max.toLocaleString('sl-SI')} €`
    if (max) return `do ${max.toLocaleString('sl-SI')} €`
    if (min) return `od ${min.toLocaleString('sl-SI')} €`
    return null
  }

  const timeAgo = (createdAt: string) => {
    const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 1) return 'pred manj kot uro'
    if (hoursAgo < 24) return `pred ${Math.floor(hoursAgo)}h`
    const daysAgo = Math.floor(hoursAgo / 24)
    return `pred ${daysAgo} ${daysAgo === 1 ? 'dnem' : 'dnevi'}`
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar
        partner={{
          business_name: partner?.business_name || 'Moj portal',
          subscription_tier: partner?.subscription_tier === 'elite' ? 'elite' : partner?.subscription_tier === 'pro' ? 'pro' : 'start',
          avg_rating: partner?.avg_rating || 0,
          is_verified: !!partner?.is_verified,
        }}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Nova povpraševanja
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredRequests.length > 0
                ? `${filteredRequests.length} odprtih povpraševanj čaka na vašo ponudbo`
                : 'Preglejte povpraševanja naročnikov in pošljite svoje ponudbe'}
            </p>
          </div>

          <MobileInquiryFilters
            categories={categoryOptions}
            locations={locationOptions}
            selectedCategory={selectedCategory}
            selectedLocation={selectedLocation}
            selectedUrgency={selectedUrgency}
            selectedBudget={selectedBudget}
          />

          {filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-lg text-muted-foreground mb-2">
                Ni rezultatov za izbrane filtre
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Poskusite razširiti filtre ali preverite ponovno čez nekaj časa
              </p>
              <Link href="/partner-dashboard/povprasevanja">
                <Button variant="outline">Počisti filtre</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => {
                // description je nullable v bazi
                const desc = request.description ?? ''
                const descriptionPreview = desc.length > 120
                  ? desc.substring(0, 120) + '...'
                  : desc
                const badge = getUrgencyBadge(request.urgency, request.created_at)
                const budget = formatBudget(request.budget_min, request.budget_max)
                // category je lahko null (pri starejših zapisih brez category_id)
                const categoryName = (request.categories as any)?.name ?? 'Splošno'

                return (
                  <Card key={request.id} className="p-5 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {categoryName}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground leading-snug">
                            {request.title}
                          </h3>
                        </div>
                      </div>

                      {/* Meta: lokacija + čas */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {/* location_city je na povprasevanja, ne na profiles */}
                        {request.location_city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{request.location_city}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{timeAgo(request.created_at)}</span>
                        </div>
                      </div>

                      {/* Opis */}
                      {descriptionPreview && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {descriptionPreview}
                        </p>
                      )}

                      {/* Budget */}
                      {budget && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Banknote className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Budget: {budget}</span>
                        </div>
                      )}

                      {/* CTA */}
                      <div className="pt-1">
                        <Link href={`/partner-dashboard/povprasevanja/${request.id}`}>
                          <Button className="gap-2 w-full sm:w-auto min-h-[44px]">
                            Pošlji ponudbo
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <PartnerBottomNav paket={{ paket: partner?.subscription_tier === 'elite' ? 'elite' : partner?.subscription_tier === 'pro' ? 'pro' : 'start' }} />
    </div>
  )
}
