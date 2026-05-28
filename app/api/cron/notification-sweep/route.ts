import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FUNNEL_EVENTS, trackFunnelEvent } from '@/lib/analytics/funnel'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'
import { withCronGuard } from '@/lib/cron/cronGuard'

function deterministicReminderNotificationId(userId: string, povprasevanjeId: string) {
  const seed = `izbira_ponudbe_reminder:${userId}:${povprasevanjeId}`
  const h = createHash('sha1').update(seed).digest('hex')
  const variant = (parseInt(h[16], 16) & 0x3) | 0x8
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-${variant.toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`
}

function deterministicTerminOpomnikId(userId: string, appointmentId: string) {
  const seed = `termin_opomnik:${userId}:${appointmentId}`
  const h = createHash('sha1').update(seed).digest('hex')
  const variant = (parseInt(h[16], 16) & 0x3) | 0x8
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-${variant.toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`
}

async function _handler(request: NextRequest) {
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
    let reminderOffset = 0
    const reminderBatchSize = 100

    while (true) {
      const { data: reminderCandidates, error: reminderFetchError } = await supabase
        .from('povprasevanja')
        .select('id, title, narocnik_id, status, created_at')
        .eq('status', 'odprto')
        .lte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(reminderOffset, reminderOffset + reminderBatchSize - 1)

      if (reminderFetchError) {
        return NextResponse.json({ error: reminderFetchError.message }, { status: 500 })
      }

      if (!reminderCandidates?.length) break

      for (const p of reminderCandidates) {
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

      try {
        await canonicalWriteGateway.appendNotification({
        id: deterministicReminderNotificationId(p.narocnik_id, p.id),
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
      } catch (error: any) {
        const code = error?.code || error?.details?.code
        if (code === '23505') {
          continue
        }
        throw error
      }
      }

      if (reminderCandidates.length < reminderBatchSize) break
      reminderOffset += reminderBatchSize
    }

    // ── termin_opomnik: 24h appointment reminders ─────────────────────────────
    // Dedup: deterministic notification ID (same pattern as izbira_ponudbe_reminder).
    // DB primary key uniqueness rejects duplicate inserts (23505) — no extra column needed.
    // The cron lock (withCronGuard) prevents concurrent runs; deterministic ID is the
    // secondary guard for webhook retries / manual re-runs.
    const now = Date.now()
    const windowStart = new Date(now + 22 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(now + 26 * 60 * 60 * 1000).toISOString()

    const { data: upcomingAppointments } = await supabase
      .from('appointments')
      .select('id, narocnik_id, obrtnik_id, scheduled_start')
      .eq('status', 'scheduled')
      .gte('scheduled_start', windowStart)
      .lte('scheduled_start', windowEnd)
      .limit(50)

    let terminReminders = 0
    for (const appt of upcomingAppointments || []) {
      const apptDate = new Date(appt.scheduled_start as string).toLocaleString('sl-SI', { timeZone: 'Europe/Ljubljana' })

      const notifyTargets: Array<{ userId: string; role: 'narocnik' | 'obrtnik' }> = []
      if (appt.narocnik_id) notifyTargets.push({ userId: appt.narocnik_id as string, role: 'narocnik' })
      if (appt.obrtnik_id) notifyTargets.push({ userId: appt.obrtnik_id as string, role: 'obrtnik' })

      for (const target of notifyTargets) {
        try {
          await canonicalWriteGateway.appendNotification({
            id: deterministicTerminOpomnikId(target.userId, appt.id as string),
            user_id: target.userId,
            type: 'termin_opomnik',
            title: 'Opomnik: termin jutri',
            body: `Imate dogovorjen termin ${apptDate}.`,
            message: `Imate dogovorjen termin ${apptDate}.`,
            link: target.role === 'narocnik' ? '/narocnik/sporocila' : '/obrtnik/sporocila',
            read: false,
            metadata: { appointment_id: appt.id, sweep_id: sweepId },
          }, 'api.cron.notification-sweep.termin')
        } catch (e: unknown) {
          const code = (e as { code?: string })?.code || (e as { details?: { code?: string } })?.details?.code
          if (code === '23505') continue // already sent this cycle — idempotent skip
          // Notification failure must not fail the cron
          console.error('[notification-sweep] termin_opomnik send failed:', e)
        }
      }
      terminReminders++
    }

    return NextResponse.json({ success: true, sweepId, total: pending.length, notified, skipped, reminders, terminReminders, durationMs: Date.now() - start })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Lock TTL: 4 min — longer than the 10-min interval is intentional only if a sweep is
// genuinely slow. Overlap is the bigger risk given the reminder-loop's table scan.
export const GET = withCronGuard(
  { jobName: 'notification-sweep', lockTtlSeconds: 240 },
  _handler,
)
