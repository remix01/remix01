import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [todayLeads, unansweredLeads, avgResponseResult, conversionResult] = await Promise.all([
    supabaseAdmin
      .from('povprasevanja')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),

    (supabaseAdmin as any)
      .from('lead_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'expired'),

    (supabaseAdmin as any)
      .from('ponudbe')
      .select('created_at, povprasevanje_id, povprasevanja:povprasevanje_id(created_at)')
      .order('created_at', { ascending: true })
      .limit(500),

    supabaseAdmin
      .from('povprasevanja')
      .select('id, status', { count: 'exact' })
      .limit(10000),
  ])

  // Average time to first ponudba (hours)
  let avgHoursToFirstOffer: number | null = null
  const offerRows = avgResponseResult.data as Array<{
    created_at: string
    povprasevanje_id: string
    povprasevanja: { created_at: string } | null
  }> | null

  if (offerRows && offerRows.length > 0) {
    const firstOfferByRequest = new Map<string, number>()
    for (const row of offerRows) {
      if (!row.povprasevanja?.created_at) continue
      const requestCreated = new Date(row.povprasevanja.created_at).getTime()
      const offerCreated = new Date(row.created_at).getTime()
      const hoursToOffer = (offerCreated - requestCreated) / (1000 * 60 * 60)
      if (!firstOfferByRequest.has(row.povprasevanje_id) || hoursToOffer < firstOfferByRequest.get(row.povprasevanje_id)!) {
        firstOfferByRequest.set(row.povprasevanje_id, hoursToOffer)
      }
    }
    if (firstOfferByRequest.size > 0) {
      const times = Array.from(firstOfferByRequest.values())
      avgHoursToFirstOffer = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
    }
  }

  // Conversion rate: completed / total (excluding draft)
  let conversionRate: number | null = null
  const allPov = conversionResult.data as Array<{ id: string; status: string }> | null
  if (allPov && allPov.length > 0) {
    const nonDraft = allPov.filter((p) => p.status !== 'draft')
    const completed = nonDraft.filter((p) => p.status === 'completed' || p.status === 'dodeljeno')
    conversionRate = nonDraft.length > 0
      ? Math.round((completed.length / nonDraft.length) * 100)
      : null
  }

  return NextResponse.json({
    todayLeads: todayLeads.count ?? 0,
    unansweredLeads: unansweredLeads.count ?? 0,
    avgHoursToFirstOffer,
    conversionRate,
  })
}
