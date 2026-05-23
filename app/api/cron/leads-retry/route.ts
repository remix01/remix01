/**
 * Cron: Lead Retry Queue Processor (Rec 6)
 *
 * Runs every hour.  Picks up requests that matched no contractors on first try
 * (they are in lead_retry_queue).  Re-runs matching with expanded radius.
 *
 * After 24 h with no success: sends admin alert.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { liquidityEngine } from '@/lib/marketplace/liquidityEngine'
import { sendNotification } from '@/lib/notifications'
import { isFeatureEnabled } from '@/lib/features/agentFlags'

const ADMIN_ALERT_AFTER_HOURS = 24
const MAX_RETRIES = 5

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return process.env.NODE_ENV !== 'production'
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const enabled = await isFeatureEnabled('cron.leads_retry', true)
  if (!enabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'feature_flag_disabled' })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: queue, error } = await (supabase as any)
    .from('lead_retry_queue')
    .select('*')
    .lte('next_retry_at', now)
    .lt('retry_count', MAX_RETRIES)
    .order('next_retry_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('[leads-retry] Query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const retried: string[] = []
  const alerted: string[] = []
  const abandoned: string[] = []

  for (const item of queue ?? []) {
    try {
      // Check if 24h admin alert threshold passed
      const ageHours = (Date.now() - new Date(item.created_at).getTime()) / (60 * 60 * 1000)
      if (ageHours >= ADMIN_ALERT_AFTER_HOURS && !item.admin_alerted_at) {
        await sendNotification({
          userId: null,
          type: 'lead_no_match',
          title: '24h brez ujemanja — ročni pregled potreben',
          message: `Povpraševanje ${item.povprasevanje_id} po ${Math.round(ageHours)}h ni dobilo nobene ujemanja. Poizkusov: ${item.retry_count}.`,
          link: `/admin/povprasevanja/${item.povprasevanje_id}`,
          metadata: { povprasevanje_id: item.povprasevanje_id, retry_count: item.retry_count },
        })
        await (supabase as any)
          .from('lead_retry_queue')
          .update({ admin_alerted_at: now })
          .eq('id', item.id)
        alerted.push(item.id)
      }

      // Abandon after MAX_RETRIES
      if (item.retry_count >= MAX_RETRIES - 1) {
        await (supabase as any).from('lead_retry_queue').delete().eq('id', item.id)
        abandoned.push(item.id)
        continue
      }

      // Re-run matching with expanded search
      const result = await liquidityEngine.onNewRequest(
        item.povprasevanje_id,
        item.lat,
        item.lng,
        item.category_id,
        item.user_id,
      )

      if (result.success) {
        // P1 fix: matching succeeded — remove from queue so it isn't retried again
        await (supabase as any).from('lead_retry_queue').delete().eq('id', item.id)
        retried.push(item.id)
      } else {
        // Still no match — exponential backoff: 1h, 2h, 4h, 8h, 16h
        const backoffHours = Math.pow(2, item.retry_count)
        const nextRetry = new Date(Date.now() + backoffHours * 60 * 60 * 1000).toISOString()
        await (supabase as any)
          .from('lead_retry_queue')
          .update({ retry_count: item.retry_count + 1, next_retry_at: nextRetry })
          .eq('id', item.id)
      }
    } catch (err) {
      console.error('[leads-retry] Error processing', item.id, ':', String(err))
      await (supabase as any)
        .from('lead_retry_queue')
        .update({ last_error: String(err), retry_count: item.retry_count + 1 })
        .eq('id', item.id)
        .catch(() => {})
    }
  }

  console.log(JSON.stringify({
    level: 'info',
    event: 'leads_retry_cron_done',
    processed: (queue ?? []).length,
    retried: retried.length,
    alerted: alerted.length,
    abandoned: abandoned.length,
  }))

  return NextResponse.json({
    ok: true,
    processed: (queue ?? []).length,
    retried: retried.length,
    alerted: alerted.length,
    abandoned: abandoned.length,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
