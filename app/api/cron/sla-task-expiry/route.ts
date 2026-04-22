/**
 * SLA Task Expiry Cron Job
 *
 * Runs periodically to expire tasks that have passed their sla_expires_at deadline.
 * Delegates all work to the expire_tasks() DB function which atomically updates
 * tasks and inserts task_events in a single CTE.
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
    console.warn('[sla-expiry] CRON_SECRET not configured - endpoint is public')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[sla-expiry] start')

    const { data: expiredCount, error } = await supabaseAdmin.rpc('expire_tasks')

    if (error) {
      console.error('[sla-expiry] expire_tasks() failed:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[sla-expiry] done — expired ${expiredCount ?? 0} tasks`)

    return NextResponse.json({
      success: true,
      expiredCount: expiredCount ?? 0,
    })
  } catch (err) {
    console.error('[sla-expiry] unhandled error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
