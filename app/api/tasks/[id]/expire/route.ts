/**
 * Task Expiry API Route
 * 
 * POST /api/tasks/[id]/expire
 * 
 * Manually expires a task with reason and audit logging.
 * Can be called by admins, system processes, or automated workflows.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { ok, fail } from '@/lib/http/response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const { reason } = await req.json()

    // Validate inputs
    if (!taskId) {
      return fail('Missing taskId', 400)
    }

    const expireReason = reason || 'Task expired'

    console.log('[v0] Expiring task:', { taskId, reason: expireReason })

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Call backend RPC function for task expiry
    const { data: rpcResult, error: rpcError } = await supabase.rpc('expire_task', {
      task_id: taskId,
      reason: expireReason,
    })

    const result = rpcResult as { success: boolean; message?: string; task?: unknown } | null

    if (rpcError) {
      console.error('[v0] RPC error in expire_task:', rpcError)
      return fail('Failed to expire task', 400, { details: rpcError })
    }

    if (!result || !result.success) {
      return fail(result?.message || 'Expiry failed', 400)
    }

    console.log('[v0] Task expired successfully:', {
      taskId,
      reason: expireReason,
    })

    // Log audit event
    await logAuditEvent(supabase, taskId, expireReason)

    return ok({
      success: true,
      task: result.task,
      message: 'Task expired successfully',
    })
  } catch (error) {
    console.error('[v0] Error expiring task:', error)
    return fail('Internal server error', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

/**
 * Log audit event for task expiry
 */
async function logAuditEvent(
  supabase: any,
  taskId: string,
  reason: string
) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
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
  }
}
