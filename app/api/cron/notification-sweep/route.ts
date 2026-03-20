import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[notification-sweep] start', ranAt: new Date().toISOString() }))

  try {
    const supabase = createAdminClient()

    // 1. Find open povprasevanja not yet broadcast to obrtniki
    const { data: povprasevanja, error: fetchError } = await supabase
      .from('povprasevanja')
      .select('id, title, category_id, location_city, urgency')
      .eq('status', 'odprto')
      .is('notified_at', null)
      .limit(50)

    if (fetchError) {
      console.error(JSON.stringify({ level: 'error', message: '[notification-sweep] fetch error', error: fetchError.message }))
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const pending = povprasevanja || []
    console.log(JSON.stringify({ level: 'info', message: '[notification-sweep] pending', count: pending.length }))

    let notified = 0
    let skipped = 0

    for (const p of pending) {
      try {
        if (!p.category_id) {
          await supabase.from('povprasevanja').update({ notified_at: new Date().toISOString() }).eq('id', p.id)
          skipped++
          continue
        }

        // 2. Find obrtniki registered for this category
        const { data: matchedCategories } = await supabase
          .from('obrtnik_categories')
          .select('obrtnik_id')
          .eq('category_id', p.category_id)

        if (!matchedCategories?.length) {
          await supabase.from('povprasevanja').update({ notified_at: new Date().toISOString() }).eq('id', p.id)
          skipped++
          continue
        }

        // 3. Only verified + available obrtniki
        const obrtnikIds = matchedCategories.map((c) => c.obrtnik_id)
        const { data: obrtniki } = await supabase
          .from('obrtnik_profiles')
          .select('id, user_id')
          .in('id', obrtnikIds)
          .eq('is_verified', true)
          .eq('is_available', true)

        if (!obrtniki?.length) {
          await supabase.from('povprasevanja').update({ notified_at: new Date().toISOString() }).eq('id', p.id)
          skipped++
          continue
        }

        // 4. Insert in-app notification for each matched obrtnik
        const notifications = obrtniki.map((o) => ({
          user_id: o.user_id,
          type: 'novo_povprasevanje',
          title: 'Novo povpraševanje v vaši kategoriji',
          message: `${p.title || 'Novo povpraševanje'}${p.location_city ? ` — ${p.location_city}` : ''}`,
          link: '/obrtnik/povprasevanja',
          read: false,
          metadata: {
            povprasevanje_id: p.id,
            urgency: p.urgency || 'normal',
          },
        }))

        const { error: notifError } = await supabase.from('notifications').insert(notifications)

        if (notifError) {
          console.error(JSON.stringify({
            level: 'error',
            message: '[notification-sweep] notification insert error',
            povprasevanjeId: p.id,
            error: notifError.message,
          }))
          // Still mark notified_at to avoid infinite retry
        }

        // 5. Mark povprasevanje as notified
        await supabase.from('povprasevanja').update({ notified_at: new Date().toISOString() }).eq('id', p.id)
        notified++

        console.log(JSON.stringify({
          level: 'info',
          message: '[notification-sweep] notified',
          povprasevanjeId: p.id,
          obrtnikiCount: obrtniki.length,
        }))
      } catch (itemErr) {
        console.error(JSON.stringify({
          level: 'error',
          message: '[notification-sweep] item error',
          povprasevanjeId: p.id,
          error: String(itemErr),
        }))
        skipped++
      }
    }

    const durationMs = Date.now() - start
    console.log(JSON.stringify({
      level: 'info',
      message: '[notification-sweep] completed',
      total: pending.length,
      notified,
      skipped,
      durationMs,
    }))

    return NextResponse.json({ success: true, total: pending.length, notified, skipped, durationMs })
  } catch (error) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({
      level: 'error',
      message: '[notification-sweep] fatal',
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    }))
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
