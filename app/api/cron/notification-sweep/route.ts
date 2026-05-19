import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FUNNEL_EVENTS, trackFunnelEvent } from '@/lib/analytics/funnel'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sweepId = randomUUID()
  const start = Date.now()

  try {
    const supabase = createAdminClient()
    const { data: povprasevanja, error: fetchError } = await supabase
      .from('povprasevanja')
      .select('id, title, category_id, location_city, urgency')
      .eq('status', 'odprto')
      .is('notified_at', null)
      .limit(50)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

    const pending = povprasevanja || []
    let notified = 0
    let skipped = 0
    let reminders = 0

    for (const p of pending) {
      let didClaim = false
      try {
        if (!p.category_id) { skipped++; continue }
        const { data: matchedCategories } = await supabase.from('obrtnik_categories').select('obrtnik_id').eq('category_id', p.category_id)
        if (!matchedCategories?.length) { skipped++; continue }
        const obrtnikIds = matchedCategories.map((c) => c.obrtnik_id)
        const { data: obrtniki } = await supabase.from('obrtnik_profiles').select('id').in('id', obrtnikIds).eq('is_verified', true).eq('is_available', true)
        if (!obrtniki?.length) { skipped++; continue }
        const { data: claimed } = await supabase.from('povprasevanja').update({ notified_at: new Date().toISOString() }).eq('id', p.id).is('notified_at', null).select('id')
        if (!claimed?.length) { skipped++; continue }
        didClaim = true

        for (const o of obrtniki) {
          await canonicalWriteGateway.appendNotification({
            user_id: o.id,
            type: 'novo_povprasevanje',
            title: 'Novo povpraševanje v vaši kategoriji',
            body: `${p.title || 'Novo povpraševanje'}${p.location_city ? ` — ${p.location_city}` : ''}`,
            message: `${p.title || 'Novo povpraševanje'}${p.location_city ? ` — ${p.location_city}` : ''}`,
            link: '/obrtnik/povprasevanja',
            read: false,
            metadata: { povprasevanje_id: p.id, urgency: p.urgency || 'normalno', sweep_id: sweepId },
          }, 'api.cron.notification-sweep')
        }

        notified++
        trackFunnelEvent(FUNNEL_EVENTS.INQUIRY_BROADCASTED, { povprasevanje_id: p.id, location: p.location_city ?? null, user_type: 'system', timestamp: new Date().toISOString() })
      } catch {
        if (didClaim) {
          try { await supabase.from('povprasevanja').update({ notified_at: null }).eq('id', p.id) } catch {}
        }
        skipped++
      }
    }

    // 7-day reminder: one notification per inquiry reminder window
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: reminderCandidates } = await supabase
      .from('povprasevanja')
      .select('id, title, narocnik_id, status, created_at')
      .eq('status', 'odprto')
      .lte('created_at', sevenDaysAgo)
      .limit(100)

    for (const p of reminderCandidates || []) {
      if (!p.narocnik_id) continue
      const { data: offers } = await supabase.from('ponudbe').select('id, status').eq('povprasevanje_id', p.id)
      const offerCount = (offers || []).length
      if (!offerCount) continue
      if ((offers || []).some((o: any) => o.status === 'sprejeta')) continue

      const dedupeKey = `offer-reminder-7d:${p.id}`
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', p.narocnik_id)
        .eq('type', 'izbira_ponudbe_reminder')
        .contains('metadata', { dedupe_key: dedupeKey })
        .limit(1)

      if (existing?.length) continue

      await canonicalWriteGateway.appendNotification({
        user_id: p.narocnik_id,
        type: 'izbira_ponudbe_reminder',
        title: '⏰ Čas za izbiro ponudbe',
        body: `Za povpraševanje "${p.title}" ste prejeli ${offerCount} ponudb. Izberite najprimernejšo.`,
        message: `Za povpraševanje "${p.title}" ste prejeli ${offerCount} ponudb. Izberite najprimernejšo.`,
        link: `/povprasevanja/${p.id}`,
        read: false,
        metadata: { povprasevanje_id: p.id, offer_count: offerCount, dedupe_key: dedupeKey, reminder_window_days: 7 },
      }, 'api.cron.notification-sweep.reminder')
      reminders++
    }

    return NextResponse.json({ success: true, sweepId, total: pending.length, notified, skipped, reminders, durationMs: Date.now() - start })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
