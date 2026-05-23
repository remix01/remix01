import { createClient } from '@/lib/supabase/client'
import type { DashboardFilters } from '@/lib/dashboard/filters'
import { serializeDashboardFilters } from '@/lib/dashboard/filters'
import { getCompletionStatus, type CompletionStatus } from '@/lib/partner/completion'
import { getOrSetCache, deleteFromCache, invalidatePattern } from '@/lib/cache/strategies'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys'

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

async function fetchPartnerDashboardSummary({ userId, filters }: { userId: string, filters: DashboardFilters }): Promise<PartnerDashboardSummary> {
  const supabase = createClient()

  // Phase 1: fetch offers, categories, and ratings in parallel.
  // Offers are fetched here so we can pass the count to getCompletionStatus
  // and avoid a redundant ponudbe query inside that helper.
  const [offersRes, categoriesRes, avgRatingRes] = await Promise.all([
    supabase.from('ponudbe').select('*').eq('obrtnik_id', userId).order('created_at', { ascending: false }),
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

  // Phase 2: fetch completion status and open requests in parallel.
  // Pass offers.length so getCompletionStatus skips its own ponudbe count query.
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

  const [completionStatus, openRequestsRes] = await Promise.all([
    getCompletionStatus(userId, offers.length),
    openRequestsQuery,
  ])

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

/**
 * Public API — wraps fetchPartnerDashboardSummary with a 5-minute Redis cache.
 * Key is scoped per userId + filter combination; falls back to a live query if
 * Redis is unavailable or the key has expired.
 */
export async function getPartnerDashboardSummary(
  { userId, filters }: { userId: string; filters: DashboardFilters }
): Promise<PartnerDashboardSummary> {
  const cacheKey = CACHE_KEYS.partnerDashboard(userId, serializeDashboardFilters(filters))
  return getOrSetCache(
    cacheKey,
    () => fetchPartnerDashboardSummary({ userId, filters }),
    CACHE_TTL.SHORT,
  )
}

/**
 * Invalidate the cached summary for a given partner.
 * Without filters: wipes ALL cached filter variants for that user (correct after mutations).
 * With filters: deletes only that specific variant.
 */
export async function invalidatePartnerDashboardCache(
  userId: string,
  filters?: DashboardFilters,
): Promise<void> {
  if (filters) {
    await deleteFromCache(CACHE_KEYS.partnerDashboard(userId, serializeDashboardFilters(filters)))
  } else {
    await invalidatePattern(`partner:dashboard:summary:${userId}:*`)
  }
}
