/**
 * Task Assignment API Route
 * 
 * POST /api/tasks/[id]/assign
 * 
 * Assigns a task to a worker with scoring validation and audit logging.
 * Backend RPC call with permission checks and error handling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id
    const { worker_id, auto_assign } = await req.json()

    // Validate inputs
    if (!taskId || !worker_id) {
      return NextResponse.json(
        { error: 'Missing taskId or worker_id' },
        { status: 400 }
      )
    }

    console.log('[v0] Assigning task:', { taskId, worker_id, auto_assign })

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Call backend RPC function for assignment
    const { data: result, error: rpcError } = await supabase.rpc('assign_task', {
      task_id: taskId,
      worker_id,
      auto_assign: auto_assign || false,
    })

    if (rpcError) {
      console.error('[v0] RPC error in assign_task:', rpcError)
      return NextResponse.json(
        { error: 'Failed to assign task', details: rpcError },
        { status: 400 }
      )
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.message || 'Assignment failed' },
        { status: 400 }
      )
    }

    console.log('[v0] Task assigned successfully:', {
      taskId,
      worker_id,
      assignmentId: result.assignment_id,
    })

    return NextResponse.json({
      success: true,
      task: result.task,
      assignment_id: result.assignment_id,
      message: 'Task assigned successfully',
    })
  } catch (error) {
    console.error('[v0] Error assigning task:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
