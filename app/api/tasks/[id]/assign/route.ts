/**
 * Task Assignment API Route
 * 
 * POST /api/tasks/[id]/assign
 * 
 * Assigns a task to a worker with scoring validation and audit logging.
 * Backend RPC call with permission checks and error handling.
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
    const { worker_id, auto_assign } = await req.json()

    // Validate inputs
    if (!taskId || !worker_id) {
      return fail('Missing taskId or worker_id', 400)
    }

    console.log('[v0] Assigning task:', { taskId, worker_id, auto_assign })

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Call backend RPC function for assignment
    const { data: rpcResult, error: rpcError } = await supabase.rpc('assign_task', {
      task_id: taskId,
      worker_id,
      auto_assign: auto_assign || false,
    })

    const result = rpcResult as { success: boolean; message?: string; assignment_id?: string; task?: unknown } | null

    if (rpcError) {
      console.error('[v0] RPC error in assign_task:', rpcError)
      return fail('Failed to assign task', 400, { details: rpcError })
    }

    if (!result || !result.success) {
      return fail(result?.message || 'Assignment failed', 400)
    }

    console.log('[v0] Task assigned successfully:', {
      taskId,
      worker_id,
      assignmentId: result.assignment_id,
    })

    return ok({
      success: true,
      task: result.task,
      assignment_id: result.assignment_id,
      message: 'Task assigned successfully',
    })
  } catch (error) {
    console.error('[v0] Error assigning task:', error)
    return fail('Internal server error', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
