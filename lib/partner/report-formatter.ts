import type { DashboardFilters } from '@/lib/dashboard/filters'
import type { PartnerDashboardSummary } from './dashboard-summary'

export interface DashboardReportPayload {
  userId: string
  period: string
  generatedAt: string
  filterContext: DashboardFilters
  kpis: {
    activeOffers: number
    acceptedOffers: number
    avgRating: number | null
    relevantOpenRequests: number
    onboardingProgressPct: number | null
  }
  meta: {
    totalOffers: number
    partnerCategories: string[]
  }
}

/**
 * Serialize a dashboard summary into a report payload.
 * Designed for reuse across weekly email reports, PDF exports, and admin digests.
 * Does not send anything — callers decide what to do with the payload.
 */
export function formatDashboardSummaryForReport(
  summary: PartnerDashboardSummary,
  userId: string,
  period: string = 'weekly',
): DashboardReportPayload {
  return {
    userId,
    period,
    generatedAt: new Date().toISOString(),
    filterContext: summary.filterContext,
    kpis: {
      activeOffers: summary.activeOffers,
      acceptedOffers: summary.acceptedOffers,
      avgRating: summary.avgRating,
      relevantOpenRequests: summary.relevantOpenRequests,
      onboardingProgressPct: summary.onboardingProgress?.completionPercentage ?? null,
    },
    meta: {
      totalOffers: summary.offers.length,
      partnerCategories: summary.partnerCategories,
    },
  }
}
