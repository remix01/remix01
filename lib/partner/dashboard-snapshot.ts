import type { DashboardFilters } from '@/lib/dashboard/filters'
import type { PartnerDashboardSummary } from './dashboard-summary'

export interface DashboardSnapshot {
  userId: string
  generatedAt: string
  filterContext: DashboardFilters
  kpis: {
    activeOffers: number
    acceptedOffers: number
    avgRating: number | null
    relevantOpenRequests: number
    onboardingProgressPct: number | null
  }
  source: 'live' | 'cache'
}

export function createDashboardSnapshot(
  summary: PartnerDashboardSummary,
  userId: string,
  source: 'live' | 'cache' = 'live',
): DashboardSnapshot {
  return {
    userId,
    generatedAt: new Date().toISOString(),
    filterContext: summary.filterContext,
    kpis: {
      activeOffers: summary.activeOffers,
      acceptedOffers: summary.acceptedOffers,
      avgRating: summary.avgRating,
      relevantOpenRequests: summary.relevantOpenRequests,
      onboardingProgressPct: summary.onboardingProgress?.completionPercentage ?? null,
    },
    source,
  }
}

/**
 * Persist a snapshot to the dashboard_summary_snapshots table.
 * Fire-and-forget — failures are silently swallowed so they never impact
 * dashboard load or the caller's flow.
 */
export async function persistDashboardSnapshot(snapshot: DashboardSnapshot): Promise<void> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    await supabase.from('dashboard_summary_snapshots').insert({
      user_id: snapshot.userId,
      generated_at: snapshot.generatedAt,
      filter_context: snapshot.filterContext,
      kpis: snapshot.kpis,
      source: snapshot.source,
    })
  } catch {
    // intentionally silent — snapshot persistence is best-effort
  }
}
