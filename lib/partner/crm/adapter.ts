import type { CRMActivityItem, CRMData, CRMPipelineItem, CRMPipelineStage, CRMStats } from './types'
import { CRM_PIPELINE_STAGES } from './types'

type OfferRow = {
  id: string
  title: string | null
  status: string
  price_estimate: number | null
  created_at: string
  povprasevanje_id: string | null
}

type EscrowRow = {
  amount_cents: number | null
}

const ACTIVITY_LABELS: Record<string, string> = {
  poslana: 'Ponudba poslana',
  sprejeta: 'Ponudba sprejeta',
  zavrnjena: 'Ponudba zavrnjena',
}

export function buildCRMStats(monthOffers: OfferRow[], escrows: EscrowRow[]): CRMStats {
  const accepted = monthOffers.filter((o) => o.status === 'sprejeta')
  const revenue = escrows.reduce((sum, e) => sum + (e.amount_cents ?? 0), 0) / 100

  return {
    offersThisMonth: monthOffers.length,
    acceptedThisMonth: accepted.length,
    conversionRate: monthOffers.length > 0 ? Math.round((accepted.length / monthOffers.length) * 100) : 0,
    revenueThisMonth: revenue,
  }
}

export function buildCRMPipeline(recentOffers: OfferRow[]): CRMPipelineStage[] {
  return CRM_PIPELINE_STAGES.map((stage) => {
    const stageOffers = recentOffers.filter((o) => o.status === stage)

    const offers: CRMPipelineItem[] = stageOffers.slice(0, 5).map((o) => ({
      id: o.id,
      title: o.title ?? null,
      price_estimate: o.price_estimate ?? null,
      created_at: o.created_at,
      povprasevanje_id: o.povprasevanje_id ?? null,
    }))

    return {
      stage,
      count: stageOffers.length,
      offers,
    }
  })
}

export function buildCRMRecentActivity(recentOffers: OfferRow[]): CRMActivityItem[] {
  return recentOffers.slice(0, 15).map((o) => ({
    id: o.id,
    type: `offer_${o.status}`,
    description: ACTIVITY_LABELS[o.status] ?? 'Ponudba posodobljena',
    amount: o.price_estimate ?? null,
    timestamp: o.created_at,
  }))
}

export function toCRMData(monthOffers: OfferRow[], recentOffers: OfferRow[], escrows: EscrowRow[]): CRMData {
  return {
    stats: buildCRMStats(monthOffers, escrows),
    pipeline: buildCRMPipeline(recentOffers),
    recentActivity: buildCRMRecentActivity(recentOffers),
  }
}
