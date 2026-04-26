import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeTier, tierHasFeature } from '@/lib/plans'

export interface CRMStats {
  offersThisMonth: number
  acceptedThisMonth: number
  conversionRate: number
  revenueThisMonth: number
}

export interface CRMPipelineItem {
  id: string
  title: string | null
  price_estimate: number | null
  created_at: string
  povprasevanje_id: string | null
}

export interface CRMPipelineStage {
  stage: 'poslana' | 'sprejeta' | 'zavrnjena'
  count: number
  offers: CRMPipelineItem[]
}

export interface CRMActivityItem {
  id: string
  type: string
  description: string
  amount: number | null
  timestamp: string
}

export interface CRMData {
  stats: CRMStats
  pipeline: CRMPipelineStage[]
  recentActivity: CRMActivityItem[]
}

const PIPELINE_STAGES = ['poslana', 'sprejeta', 'zavrnjena'] as const

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  const tier = normalizeTier(profile?.subscription_tier)
  if (!tierHasFeature(tier, 'crm')) {
    return NextResponse.json({ error: 'PRO paket obvezen.' }, { status: 403 })
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: monthOffers, error: monthErr }, { data: recentOffers, error: recentErr }, escrowResult] = await Promise.all([
    supabase
      .from('ponudbe')
      .select('id, status, price_estimate, created_at')
      .eq('obrtnik_id', user.id)
      .gte('created_at', monthStart),
    supabase
      .from('ponudbe')
      .select('id, title, status, price_estimate, created_at, povprasevanje_id')
      .eq('obrtnik_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('escrow_transactions')
      .select('amount_cents')
      .eq('partner_id', user.id)
      .gte('created_at', monthStart),
  ])

  if (monthErr) console.error('[GET /api/partner/crm] monthOffers error:', monthErr.message)
  if (recentErr) console.error('[GET /api/partner/crm] recentOffers error:', recentErr.message)
  if (escrowResult.error) console.error('[GET /api/partner/crm] escrow error:', escrowResult.error.message)

  const offers = monthOffers ?? []
  const accepted = offers.filter((o) => o.status === 'sprejeta')
  const revenue = (escrowResult.data ?? []).reduce((sum, e) => sum + (e.amount_cents ?? 0), 0) / 100

  const stats: CRMStats = {
    offersThisMonth: offers.length,
    acceptedThisMonth: accepted.length,
    conversionRate: offers.length > 0 ? Math.round((accepted.length / offers.length) * 100) : 0,
    revenueThisMonth: revenue,
  }

  const pipeline: CRMPipelineStage[] = PIPELINE_STAGES.map((stage) => {
    const stageOffers = (recentOffers ?? []).filter((o) => o.status === stage)
    return {
      stage,
      count: stageOffers.length,
      offers: stageOffers.slice(0, 5).map((o) => ({
        id: o.id,
        title: o.title,
        price_estimate: o.price_estimate,
        created_at: o.created_at,
        povprasevanje_id: o.povprasevanje_id,
      })),
    }
  })

  const ACTIVITY_LABELS: Record<string, string> = {
    poslana: 'Ponudba poslana',
    sprejeta: 'Ponudba sprejeta',
    zavrnjena: 'Ponudba zavrnjena',
  }

  const recentActivity: CRMActivityItem[] = (recentOffers ?? []).slice(0, 15).map((o) => ({
    id: o.id,
    type: `offer_${o.status}`,
    description: ACTIVITY_LABELS[o.status] ?? 'Ponudba posodobljena',
    amount: o.price_estimate,
    timestamp: o.created_at,
  }))

  return NextResponse.json({ success: true, data: { stats, pipeline, recentActivity } satisfies { stats: CRMStats; pipeline: CRMPipelineStage[]; recentActivity: CRMActivityItem[] } })
}
