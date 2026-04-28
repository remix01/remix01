/**
 * Weekly Provider Digest Cron Job
 *
 * Runs every Monday at 08:00 UTC. For each verified obrtnik, computes:
 * - New tasks in their categories this week
 * - Their pending ponudbe count
 * - Accepted ponudbe this week (as a proxy for earnings)
 *
 * Then sends a weekly summary email to each active provider.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { automationWeeklyProviderDigest } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[weekly-provider-digest] start', ranAt: new Date().toISOString() }))

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all verified obrtniki with email
    const { data: obrtniki, error: obrtnikiError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, ime, email')
      .eq('is_verified', true)
      .not('email', 'is', null)
      .limit(500)

    if (obrtnikiError) {
      console.error('[weekly-provider-digest] obrtniki query error:', obrtnikiError.message)
      return NextResponse.json({ error: obrtnikiError.message }, { status: 500 })
    }

    if (!obrtniki?.length) {
      console.log('[weekly-provider-digest] no verified obrtniki')
      return NextResponse.json({ success: true, sent: 0, message: 'No active providers' })
    }

    const obrtnikiIds = obrtniki.map((o) => o.id)

    // Fetch category registrations for these obrtniki
    const { data: categoryRows } = await supabaseAdmin
      .from('obrtnik_categories')
      .select('obrtnik_id, category_id')
      .in('obrtnik_id', obrtnikiIds)

    // Build map: obrtnikId -> categoryIds[]
    const obrtnikiCategoryMap = new Map<string, string[]>()
    for (const row of categoryRows || []) {
      if (!obrtnikiCategoryMap.has(row.obrtnik_id)) {
        obrtnikiCategoryMap.set(row.obrtnik_id, [])
      }
      obrtnikiCategoryMap.get(row.obrtnik_id)!.push(row.category_id)
    }

    // Fetch new tasks this week
    const { data: newTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, category_id')
      .gte('created_at', weekAgo)
      .in('status', ['open', 'has_ponudbe', 'in_progress', 'completed'])

    // Count new tasks per category
    const tasksByCategory = new Map<string, number>()
    for (const task of newTasks || []) {
      if (!task.category_id) continue
      tasksByCategory.set(task.category_id, (tasksByCategory.get(task.category_id) || 0) + 1)
    }

    // Fetch ponudbe stats for this week
    const { data: ponudbeRows } = await supabaseAdmin
      .from('ponudbe')
      .select('obrtnik_id, status, cena')
      .in('obrtnik_id', obrtnikiIds)
      .gte('created_at', weekAgo)

    // Build stats per obrtnik
    const pendingByObrtnik = new Map<string, number>()
    const earningsByObrtnik = new Map<string, number>()
    for (const p of ponudbeRows || []) {
      if (p.status === 'sprejeto') {
        earningsByObrtnik.set(p.obrtnik_id, (earningsByObrtnik.get(p.obrtnik_id) || 0) + (p.cena || 0))
      }
      if (p.status !== 'zavrnjeno') {
        pendingByObrtnik.set(p.obrtnik_id, (pendingByObrtnik.get(p.obrtnik_id) || 0) + 1)
      }
    }

    // Assemble providers list for the digest
    const providers = obrtniki
      .map((o) => {
        const categoryIds = obrtnikiCategoryMap.get(o.id) || []
        const newRequests = categoryIds.reduce(
          (sum, catId) => sum + (tasksByCategory.get(catId) || 0),
          0
        )
        const pendingJobs = pendingByObrtnik.get(o.id) || 0
        const totalEarnings = earningsByObrtnik.get(o.id) || 0

        // Skip providers with no activity to keep emails relevant
        if (newRequests === 0 && pendingJobs === 0 && totalEarnings === 0) return null

        return {
          email: o.email as string,
          name: o.ime || 'Mojster',
          newRequests,
          pendingJobs,
          totalEarnings,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    if (!providers.length) {
      console.log('[weekly-provider-digest] no providers with activity')
      return NextResponse.json({ success: true, sent: 0, message: 'No provider activity this week' })
    }

    const result = await automationWeeklyProviderDigest(providers, APP_URL)

    const elapsed = Date.now() - start
    console.log(JSON.stringify({ level: 'info', message: '[weekly-provider-digest] done', sent: providers.length, elapsed }))

    return NextResponse.json({
      success: result.success,
      sent: providers.length,
      elapsed,
    })
  } catch (error) {
    console.error('[weekly-provider-digest] error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
