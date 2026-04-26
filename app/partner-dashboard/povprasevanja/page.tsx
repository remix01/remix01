import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, MapPin, Banknote, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { PovprasevanjaFilters } from '@/components/partner/povprasevanja-filters'

const PAGE_SIZE = 12

type SearchParams = {
  page?: string
  category?: string
  urgency?: string
}

function getUrgencyBadge(urgency: string | null, createdAt: string) {
  if (urgency === 'nujno') return { label: 'Nujno', color: 'bg-red-100 text-red-800' }
  if (urgency === 'ta_teden') return { label: 'Ta teden', color: 'bg-orange-100 text-orange-800' }
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 2) return { label: 'Novo', color: 'bg-blue-100 text-blue-800' }
  if (hoursAgo < 24) return { label: 'Danes', color: 'bg-green-100 text-green-800' }
  return { label: 'Odprto', color: 'bg-gray-100 text-gray-800' }
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  if (min && max) return `${min.toLocaleString('sl-SI')} – ${max.toLocaleString('sl-SI')} €`
  if (max) return `do ${max.toLocaleString('sl-SI')} €`
  if (min) return `od ${min.toLocaleString('sl-SI')} €`
  return null
}

function timeAgo(createdAt: string) {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 1) return 'pred manj kot uro'
  if (hoursAgo < 24) return `pred ${Math.floor(hoursAgo)}h`
  const daysAgo = Math.floor(hoursAgo / 24)
  return `pred ${daysAgo} ${daysAgo === 1 ? 'dnem' : 'dnevi'}`
}

function buildPageUrl(params: SearchParams, page: number) {
  const q = new URLSearchParams()
  if (params.category) q.set('category', params.category)
  if (params.urgency) q.set('urgency', params.urgency)
  if (page > 1) q.set('page', String(page))
  const qs = q.toString()
  return `/partner-dashboard/povprasevanja${qs ? `?${qs}` : ''}`
}

export default async function PovprasevanjePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = await createClient()

  const [{ data: categories }, queryResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order'),
    (() => {
      let q = supabase
        .from('povprasevanja')
        .select(
          `id, title, description, status, location_city,
           urgency, budget_min, budget_max, created_at, category_id,
           categories:category_id(name, icon_name)`,
          { count: 'exact' },
        )
        .eq('status', 'odprto')
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (params.category) q = q.eq('category_id', params.category)
      if (params.urgency) q = q.eq('urgency', params.urgency as 'normalno' | 'kmalu' | 'nujno')

      return q
    })(),
  ])

  const requests = queryResult.data ?? []
  const totalCount = queryResult.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Nova povpraševanja</h1>
        <p className="text-muted-foreground mt-1">Preglejte povpraševanja naročnikov in pošljite svoje ponudbe</p>
      </div>

      <Suspense fallback={null}>
        <PovprasevanjaFilters
          categories={categories ?? []}
          activeCategory={params.category}
          activeUrgency={params.urgency}
          totalCount={totalCount}
        />
      </Suspense>

      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-muted-foreground mb-2">Ni povpraševanj za izbrane filtre</p>
          <p className="text-sm text-muted-foreground mb-6">Preverite ponovno čez nekaj časa ali spremenite filtre</p>
          <Link href="/partner-dashboard/povprasevanja">
            <Button variant="outline">Počisti filtre</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {requests.map((request) => {
              const desc = request.description ?? ''
              const descriptionPreview = desc.length > 120 ? desc.substring(0, 120) + '...' : desc
              const badge = getUrgencyBadge(request.urgency, request.created_at)
              const budget = formatBudget(request.budget_min, request.budget_max)
              const categoryName = (request.categories as { name: string } | null)?.name ?? 'Splošno'

              return (
                <Card key={request.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
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
                        <h3 className="font-semibold text-foreground leading-snug">{request.title}</h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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

                    {descriptionPreview && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{descriptionPreview}</p>
                    )}

                    {budget && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Banknote className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Budget: {budget}</span>
                      </div>
                    )}

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

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <Link
                href={buildPageUrl(params, page - 1)}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-40' : ''}
              >
                <Button variant="outline" size="sm" className="gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Prejšnja
                </Button>
              </Link>

              <span className="text-sm text-muted-foreground">
                Stran {page} od {totalPages}
              </span>

              <Link
                href={buildPageUrl(params, page + 1)}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-40' : ''}
              >
                <Button variant="outline" size="sm" className="gap-1">
                  Naslednja
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
