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

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[v0] CRON_SECRET not configured in production — request denied')
      return false
    }
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization
    if (!verifyCronSecret(req)) {
      console.error('[v0] Unauthorized cron request')
      return fail('Unauthorized', 401)
    }

    console.log('[v0] SLA task expiry cron job started')

    // Find all tasks that:
    // 1. Are in a non-terminal state (not already expired, completed, or cancelled)
    // 2. Have an SLA deadline
    // 3. Have passed their SLA deadline
    const now = new Date().toISOString()

    console.log('[v0] Querying for overdue tasks...')

    const { data: overdueTasks, error: queryError } = await supabaseAdmin
      .from('tasks')
      .select('id, expires_at, status')
      .in('status', ['open', 'has_ponudbe', 'in_progress'])
      .not('expires_at', 'is', null)
      .lt('expires_at', now)

    if (queryError) {
      console.error('[v0] Error querying overdue tasks:', queryError)
      return fail(queryError.message || 'Failed to query tasks', 500)
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      console.log('[v0] No overdue tasks found')
      return ok({ message: 'No overdue tasks to expire', expiredCount: 0 })
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

    console.log('[v0] SLA task expiry cron job completed:', summary)

    return ok(summary as unknown as Record<string, unknown>)
  } catch (error) {
    console.error('[v0] SLA task expiry cron job failed:', error)
    return fail('Cron job failed', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
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
    task_id: taskId,
    reason: 'SLA deadline passed - automated expiry',
  })

  if (
    firstTry.error &&
    (firstTry.error.message?.includes('function') ||
      firstTry.error.message?.includes('does not exist') ||
      firstTry.error.message?.includes('No function matches'))
  ) {
    // RPC not available — fall back to a direct status update.
    return supabaseAdmin
      .from('tasks')
      .update({ status: 'expired' })
      .eq('id', taskId)
      .in('status', ['open', 'has_ponudbe', 'in_progress'])
  }

  return firstTry
}

// Also export POST for testing
export async function POST(req: NextRequest) {
  return GET(req)
}
