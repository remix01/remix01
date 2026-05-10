/**
 * SLA Task Expiry Cron Job
 *
 * Runs periodically to expire tasks that have passed their SLA deadline.
 * Delegates to the expire_tasks() DB function which handles the update and
 * inserts task_events entries atomically.
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
import { env } from '@/lib/env'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sla-task-expiry] CRON_SECRET not configured in production — request denied')
      return false
    }
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  const requestId =
    req.headers.get('x-request-id') ||
    req.headers.get('x-vercel-id') ||
    'unknown'

  if (!verifyCronSecret(req)) {
    console.error('[sla-task-expiry] Unauthorized cron request', { requestId })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[sla-task-expiry] Starting', {
    requestId,
    timestamp: new Date().toISOString(),
    hasSupabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  })

  try {
    // expire_tasks() updates tasks where sla_expires_at < now() and writes
    // task_events rows — all in a single atomic transaction.
    const { data: expiredCount, error } = await supabaseAdmin.rpc('expire_tasks')

    if (error) {
      console.error('[sla-task-expiry] expire_tasks() failed', { requestId, error })
      return NextResponse.json(
        { success: false, error: 'expire_tasks RPC failed', details: error.message },
        { status: 500 }
      )
    }

    const count = expiredCount ?? 0
    console.log('[sla-task-expiry] Done', { requestId, expiredCount: count })

    return NextResponse.json({
      success: true,
      expiredCount: count,
      message: `Expired ${count} overdue task${count !== 1 ? 's' : ''}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[sla-task-expiry] Unexpected error', { requestId, message })
    return NextResponse.json(
      { success: false, error: 'Cron job failed', message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
