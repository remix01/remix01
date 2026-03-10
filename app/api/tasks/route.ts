/**
 * Task Orchestrator Integration - Main entry point
 * 
 * This route integrates the Task Orchestrator with the Liquidity Engine.
 * When creating a task, automatically triggers matching and broadcasts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { taskOrchestrator } from '@/lib/services'
import { liquidityEngine } from '@/lib/marketplace/liquidityEngine'

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
      // Create new task
      const task = await taskOrchestrator.createTask(data)
      
      // Trigger Liquidity Engine — auto-matching, broadcast, instant offers
      // Fire and forget — don't block API response
      liquidityEngine.onNewRequest(
        data.requestId,
        data.lat,
        data.lng,
        data.categoryId,
        user.id
      ).catch(err => {
        console.error('[tasks] Liquidity engine error:', err)
        // Log but don't fail — task was already created
      })

      return NextResponse.json({ success: true, data: task })
    }

    if (action === 'accept_offer') {
      // Accept offer — orchestrator will enqueue escrow creation
      // This endpoint just triggers the orchestrator state transition
      // TODO: Implement full accept_offer flow with orchestrator
      return NextResponse.json(
        { error: 'Not yet implemented' },
        { status: 501 }
      )
    }

    if (action === 'start_task') {
      // Mark task as started — orchestrator will enqueue job
      // TODO: Implement start_task flow
      return NextResponse.json(
        { error: 'Not yet implemented' },
        { status: 501 }
      )
    }

    if (action === 'complete_task') {
      // Mark task as completed — orchestrator will enqueue escrow release
      // TODO: Implement complete_task flow
      return NextResponse.json(
        { error: 'Not yet implemented' },
        { status: 501 }
      )
    }

    if (action === 'get_task') {
      // Fetch task by ID
      // TODO: Implement get_task
      return NextResponse.json(
        { error: 'Not yet implemented' },
        { status: 501 }
      )
    }

    if (action === 'list_tasks') {
      // List user's tasks
      // TODO: Implement list_tasks
      return NextResponse.json(
        { error: 'Not yet implemented' },
        { status: 501 }
      )
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
