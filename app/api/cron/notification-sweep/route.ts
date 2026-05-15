import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FUNNEL_EVENTS, trackFunnelEvent } from '@/lib/analytics/funnel'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sweepId = randomUUID()
  const start = Date.now()
  console.log(JSON.stringify({
    level: 'info',
    message: '[notification-sweep] start',
    sweepId,
    ranAt: new Date().toISOString(),
  }))

  try {
    const supabase = createAdminClient()

    // Only fetch povprasevanja not yet notified (idempotency: notified_at IS NULL)
    const { data: povprasevanja, error: fetchError } = await supabase
      .from('povprasevanja')
      .select('id, title, category_id, location_city, urgency')
      .eq('status', 'odprto')
      .is('notified_at', null)
      .limit(50)

    if (fetchError) {
      console.error(JSON.stringify({
        level: 'error',
        message: '[notification-sweep] fetch error',
        sweepId,
        error: fetchError.message,
      }))
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const pending = povprasevanja || []
    console.log(JSON.stringify({
      level: 'info',
      message: '[notification-sweep] pending',
      sweepId,
      count: pending.length,
    }))

    let notified = 0
    let skipped = 0

    for (const p of pending) {
      const itemCorrelationId = randomUUID()
      // Tracks whether we successfully claimed notified_at for this item.
      // The catch block resets the claim if an unexpected exception fires
      // after claiming, so future sweeps can retry the item.
      let didClaim = false
      try {
        if (!p.category_id) {
          skipped++
          continue
        }

        // Find obrtniki registered for this category
        const { data: matchedCategories } = await supabase
          .from('obrtnik_categories')
          .select('obrtnik_id')
          .eq('category_id', p.category_id)

        if (!matchedCategories?.length) {
          skipped++
          continue
        }

        // Only verified + available obrtniki
        const obrtnikIds = matchedCategories.map((c) => c.obrtnik_id)
        const { data: obrtniki } = await supabase
          .from('obrtnik_profiles')
          .select('id')
          .in('id', obrtnikIds)
          .eq('is_verified', true)
          .eq('is_available', true)

        if (!obrtniki?.length) {
          skipped++
          continue
        }

        // Atomic claim: set notified_at only if still NULL.
        // If another concurrent sweep worker already claimed this item, skip it.
        // Using SELECT after UPDATE to detect the race.
        const { data: claimed } = await supabase
          .from('povprasevanja')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', p.id)
          .is('notified_at', null)
          .select('id')

        if (!claimed?.length) {
          skipped++
          continue
        }
        didClaim = true

        // Insert in-app notification for each matched obrtnik
        const notifications = obrtniki.map((o) => ({
          user_id: o.id,
          type: 'novo_povprasevanje',
          title: 'Novo povpraševanje v vaši kategoriji',
          body: `${p.title || 'Novo povpraševanje'}${p.location_city ? ` — ${p.location_city}` : ''}`,
          message: `${p.title || 'Novo povpraševanje'}${p.location_city ? ` — ${p.location_city}` : ''}`,
          link: '/obrtnik/povprasevanja',
          read: false,
          metadata: {
            povprasevanje_id: p.id,
            urgency: p.urgency || 'normalno',
            sweep_id: sweepId,
            correlation_id: itemCorrelationId,
          },
        }))

        const { error: notifError } = await supabase.from('notifications').insert(notifications)

        if (notifError) {
          console.error(JSON.stringify({
            level: 'error',
            message: '[notification-sweep] notification insert error',
            sweepId,
            correlationId: itemCorrelationId,
            povprasevanjeId: p.id,
            error: notifError.message,
          }))
          // Reset claim so next sweep run retries this item
          await supabase
            .from('povprasevanja')
            .update({ notified_at: null })
            .eq('id', p.id)
          skipped++
          continue
        }

        notified++
        trackFunnelEvent(FUNNEL_EVENTS.INQUIRY_BROADCASTED, {
          povprasevanje_id: p.id,
          location: p.location_city ?? null,
          user_type: 'system',
          timestamp: new Date().toISOString(),
        })

        console.log(JSON.stringify({
          level: 'info',
          message: '[notification-sweep] notified',
          sweepId,
          correlationId: itemCorrelationId,
          povprasevanjeId: p.id,
          obrtnikiCount: obrtniki.length,
        }))
      } catch (itemErr) {
        // Release the claim so the next sweep run retries this item.
        // Best-effort: if the reset itself fails, the item is stuck but
        // an admin can manually clear notified_at.
        if (didClaim) {
          await supabase
            .from('povprasevanja')
            .update({ notified_at: null })
            .eq('id', p.id)
            .catch(() => {/* logged below */})
        }
        console.error(JSON.stringify({
          level: 'error',
          message: '[notification-sweep] item error',
          sweepId,
          correlationId: itemCorrelationId,
          povprasevanjeId: p.id,
          claimReleased: didClaim,
          error: String(itemErr),
        }))
        skipped++
      }
    }

    const durationMs = Date.now() - start
    console.log(JSON.stringify({
      level: 'info',
      message: '[notification-sweep] completed',
      sweepId,
      total: pending.length,
      notified,
      skipped,
      durationMs,
    }))

    return NextResponse.json({ success: true, sweepId, total: pending.length, notified, skipped, durationMs })
  } catch (error) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({
      level: 'error',
      message: '[notification-sweep] fatal',
      sweepId,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    }))
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
