/**
 * SLA Task Expiry Cron Job
 *
 * Runs periodically to find and expire tasks that have passed their SLA deadline.
 * Intended to be run via Vercel Cron or similar scheduler (every hour recommended).
 *
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sla-task-expiry",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('[v0] CRON_SECRET not configured - cron endpoint is public')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronSecret(req)) {
      console.error('[v0] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] SLA task expiry cron job started')

    const now = new Date().toISOString()

    const { data: overdueTasks, error: queryError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .in('status', ['published', 'claimed', 'accepted', 'in_progress'])
      .not('sla_expires_at', 'is', null)
      .lt('sla_expires_at', now)

    if (queryError) {
      console.error('[v0] Error querying overdue tasks:', queryError)
      return NextResponse.json(
        { error: 'Failed to query tasks', details: queryError },
        { status: 500 }
      )
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      console.log('[v0] No overdue tasks found')
      return NextResponse.json({
        success: true,
        message: 'No overdue tasks to expire',
        expiredCount: 0,
      })
    }

    const overdueIds = overdueTasks.map((t: { id: string }) => t.id)
    console.log(`[v0] Found ${overdueIds.length} overdue tasks to expire`)

    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({ status: 'expired' })
      .in('id', overdueIds)

    if (updateError) {
      console.error('[v0] Failed to expire tasks:', updateError)
      return NextResponse.json(
        { error: 'Failed to expire tasks', details: updateError },
        { status: 500 }
      )
    }

    const { error: eventsError } = await supabaseAdmin
      .from('task_events')
      .insert(
        overdueIds.map((id: string) => ({
          task_id: id,
          event_type: 'expired',
          payload: { reason: 'SLA deadline passed - automated expiry' },
        }))
      )

    if (eventsError) {
      // Non-fatal: tasks are already expired
      console.error('[v0] Failed to log task_events:', eventsError)
    }

    const summary = {
      success: true,
      expiredCount: overdueIds.length,
      expiredIds: overdueIds,
      message: `Expired ${overdueIds.length} overdue tasks`,
    }

    console.log('[v0] SLA task expiry cron job completed:', summary)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[v0] SLA task expiry cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
