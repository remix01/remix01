/**
 * Task Orchestrator Integration - Main entry point
 * 
 * This route integrates the Task Orchestrator with job queue operations.
 * It handles task lifecycle state transitions and triggers appropriate jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { taskOrchestrator } from '@/lib/services'
import { enqueue } from '@/lib/jobs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, taskId, data } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Route to appropriate orchestrator action
    if (action === 'create_task') {
      // Create new task and trigger matching
      const task = await taskOrchestrator.createTask(data)
      
      // Enqueue matching job
      await enqueue({
        type: 'match_request',
        payload: {
          taskId: task.id,
          requestId: task.request_id,
          lat: task.location.lat,
          lng: task.location.lng,
        },
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'accept_offer') {
      // Accept offer and create escrow
      const task = await taskOrchestrator.acceptOffer(
        taskId,
        data.offerId,
        user.id
      )

      // Enqueue escrow creation
      await enqueue({
        type: 'create_escrow',
        payload: {
          taskId: task.id,
          amount: task.offer_amount,
        },
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'start_task') {
      // Mark task as started
      const task = await taskOrchestrator.startTask(taskId, user.id)

      // Enqueue task started notification
      await enqueue({
        type: 'task_started',
        payload: { taskId: task.id },
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'complete_task') {
      // Mark task as completed
      const task = await taskOrchestrator.completeTask(taskId, user.id)

      // Enqueue review request
      await enqueue({
        type: 'request_review',
        payload: { taskId: task.id },
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'get_task') {
      // Fetch task by ID
      const task = await taskOrchestrator.getTask(taskId, user.id)
      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'list_tasks') {
      // List user's tasks
      const tasks = await taskOrchestrator.listTasks(user.id, data?.filter)
      return NextResponse.json({ success: true, data: tasks })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[tasks] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
