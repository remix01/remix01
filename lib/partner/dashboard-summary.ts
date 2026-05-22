import { createClient } from '@/lib/supabase/client'
import type { DashboardFilters } from '@/lib/dashboard/filters'
import { getCompletionStatus, type CompletionStatus } from '@/lib/partner/completion'

export interface PartnerDashboardSummary {
  offers: any[]
  activeOffers: number
  acceptedOffers: number
  avgRating: number | null
  relevantOpenRequests: number
  onboardingProgress: CompletionStatus | null
  paymentStats: null
  unreadMessages: null
  partnerCategories: string[]
  categoryIds: string[]
  filterContext: DashboardFilters
}

function computeDateFromRange(dateRange: DashboardFilters['dateRange']): string | null {
  const now = new Date()
  const from = new Date(now)
  if (dateRange === '7d') from.setDate(now.getDate() - 7)
  else if (dateRange === '30d') from.setDate(now.getDate() - 30)
  else if (dateRange === '90d') from.setDate(now.getDate() - 90)
  else return null
  return from.toISOString()
}

export async function getPartnerDashboardSummary({ userId, filters }: { userId: string, filters: DashboardFilters }): Promise<PartnerDashboardSummary> {
  const supabase = createClient()

  const [offersRes, completionStatus, categoriesRes, avgRatingRes] = await Promise.all([
    supabase.from('ponudbe').select('*').eq('obrtnik_id', userId).order('created_at', { ascending: false }),
    getCompletionStatus(userId),
    supabase.from('obrtnik_categories').select('category_id, categories(id, name)').eq('obrtnik_id', userId),
    supabase.from('ocene').select('rating').eq('obrtnik_id', userId),
  ])

  const offers = offersRes.data ?? []
  const activeOffers = offers.filter((o) => o.status === 'poslana').length
  const acceptedOffers = offers.filter((o) => o.status === 'sprejeta').length

  const ratings = avgRatingRes.data ?? []
  const avgRating = ratings.length > 0
    ? Number((ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / ratings.length).toFixed(2))
    : null

  const categoryIds = (categoriesRes.data ?? []).map((row: any) => row.category_id).filter(Boolean)
  const partnerCategories = (categoriesRes.data ?? [])
    .map((row: any) => row.categories?.name)
    .filter((name: unknown): name is string => typeof name === 'string')

  let openRequestsQuery = supabase
    .from('povprasevanja')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'odprto')

  if (filters.category) {
    openRequestsQuery = openRequestsQuery.eq('category_id', filters.category)
  } else if (categoryIds.length > 0) {
    openRequestsQuery = openRequestsQuery.in('category_id', categoryIds)
  }

  if (filters.location) {
    openRequestsQuery = openRequestsQuery.ilike('location_city', `%${filters.location}%`)
  }

  const dateFrom = computeDateFromRange(filters.dateRange)
  if (dateFrom) {
    openRequestsQuery = openRequestsQuery.gte('created_at', dateFrom)
  }

  const openRequestsRes = await openRequestsQuery

  return {
    offers,
    activeOffers,
    acceptedOffers,
    avgRating,
    relevantOpenRequests: openRequestsRes.count ?? 0,
    onboardingProgress: completionStatus ?? null,
    paymentStats: null,
    unreadMessages: null,
    partnerCategories,
    categoryIds,
    filterContext: filters,
  }
}
