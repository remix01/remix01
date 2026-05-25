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
import { env } from '@/lib/env'
import { withCronGuard } from '@/lib/cron/cronGuard'

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Non-Error thrown',
    raw: error,
  }
}

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return serializeError(error)
  }

  const dbError = error as Record<string, unknown>
  return {
    message: typeof dbError.message === 'string' ? dbError.message : undefined,
    details: typeof dbError.details === 'string' ? dbError.details : undefined,
    hint: typeof dbError.hint === 'string' ? dbError.hint : undefined,
    code: typeof dbError.code === 'string' ? dbError.code : undefined,
  }
}

function getCronEnvDiagnostics() {
  return {
    nodeEnv: process.env.NODE_ENV,
    hasCronSecret: Boolean(env.CRON_SECRET),
    hasSupabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  }
}

async function _handler(req: NextRequest) {
  try {
    const requestId =
      req.headers.get('x-request-id') ||
      req.headers.get('x-vercel-id') ||
      'unknown'

    console.log('[v0] SLA task expiry cron job started', {
      requestId,
      timestamp: new Date().toISOString(),
      diagnostics: getCronEnvDiagnostics(),
    })

    // Find all tasks that:
    // 1. Are in a non-terminal state (not already expired, completed, or cancelled)
    // 2. Have an SLA deadline
    // 3. Have passed their SLA deadline
    const now = new Date().toISOString()

    console.log('[v0] Querying for overdue tasks...')

    const { data: overdueTasks, error: queryError } = await supabaseAdmin
      .from('tasks')
      // Keep the projection minimal: selecting non-existent columns on Supabase
      // causes PostgREST to fail the whole query with a 500 response upstream.
      .select('id, sla_expires_at, status')
      .in('status', ['open', 'has_ponudbe', 'in_progress'])
      .not('sla_expires_at', 'is', null)
      .lt('sla_expires_at', now)

    if (queryError) {
      console.error('[v0] Error querying overdue tasks:', {
        requestId,
        now,
        diagnostics: getCronEnvDiagnostics(),
        queryError: serializeDbError(queryError),
      })
      return NextResponse.json(
        { error: 'Failed to query tasks', details: serializeDbError(queryError), requestId },
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

    console.log(`[v0] Found ${overdueTasks.length} overdue tasks to expire`)

    // Expire each task using the RPC function
    const expiredIds: string[] = []
    const failedIds: string[] = []

    for (const task of overdueTasks) {
      try {
        console.log(`[v0] Expiring task: ${task.id}`)

        const { error: expireError } = await expireTask(task.id)

        if (expireError) {
          console.error(`[v0] Failed to expire task ${task.id}:`, expireError)
          failedIds.push(task.id)
        } else {
          console.log(`[v0] Successfully expired task: ${task.id}`)
          expiredIds.push(task.id)

          // Log audit event
          await logAuditEvent(task.id, 'SLA expiry by cron job')
        }
      } catch (err) {
        console.error(`[v0] Error expiring task ${task.id}:`, err)
        failedIds.push(task.id)
      }
    }

    const summary = {
      success: true,
      totalOverdue: overdueTasks.length,
      expiredCount: expiredIds.length,
      failedCount: failedIds.length,
      expiredIds,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      message: `Expired ${expiredIds.length} of ${overdueTasks.length} overdue tasks`,
    }

    console.log('[v0] SLA task expiry cron job completed:', { requestId, ...summary })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[v0] SLA task expiry cron job failed:', {
      requestId:
        req.headers.get('x-request-id') ||
        req.headers.get('x-vercel-id') ||
        'unknown',
      error: serializeError(error),
      diagnostics: getCronEnvDiagnostics(),
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        diagnostics: getCronEnvDiagnostics(),
      },
      { status: 500 }
    )
  }
}

/**
 * Log audit event for task expiry
 */
async function logAuditEvent(
  taskId: string,
  reason: string
) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      table_name: 'tasks',
      record_id: taskId,
      action: 'UPDATE',
      new_data: {
        status: 'expired',
        reason,
      },
      changed_by: 'system',
      changed_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[v0] Failed to log audit event:', error)
    }
  } catch (err) {
    console.error('[v0] Error logging audit event:', err)
    // Don't throw - audit logging failure shouldn't stop expiry
  }
}

async function expireTask(taskId: string) {
  const firstTry = await supabaseAdmin.rpc('expire_task', {
    p_task_id: taskId,
  })

  if (
    firstTry.error &&
    (firstTry.error.message?.includes('function') ||
      firstTry.error.message?.includes('does not exist') ||
      firstTry.error.message?.includes('No function matches'))
  ) {
    return supabaseAdmin.rpc('expire_task', { p_task_id: taskId })
  }

  return firstTry
}

export const GET = withCronGuard(
  { jobName: 'sla-task-expiry', lockTtlSeconds: 300 },
  _handler,
)

// Also export POST for testing
export const POST = GET
