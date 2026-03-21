/**
 * Admin Event Replay API
 * 
 * Endpoint for debugging: replay events from event_log for troubleshooting
 * Only accessible to admin users
 * 
 * Usage:
 * POST /api/admin/events/replay
 * {
 *   "taskId": "...",
 *   "dryRun": true,
 *   "fromDate": "2025-03-10T00:00:00Z",
 *   "eventNames": ["task.created", "task.matched"]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eventReplay } from '@/lib/events/eventReplay'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string | null } | null

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { taskId, eventLogId, dryRun, fromDate, eventNames } = body

    // Validate input
    if (!taskId && !eventLogId) {
      return NextResponse.json(
        { error: 'Either taskId or eventLogId required' },
        { status: 400 }
      )
    }

    // Replay by single event ID
    if (eventLogId) {
      try {
        await eventReplay.replayById(eventLogId)
        return NextResponse.json({
          success: true,
          message: 'Event replayed successfully',
          eventLogId,
        })
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to replay event' },
          { status: 400 }
        )
      }
    }

    // Replay all events for a task
    if (taskId) {
      try {
        const result = await eventReplay.replayForTask(taskId, {
          dryRun: dryRun === true,
          fromDate: fromDate ? new Date(fromDate) : undefined,
          eventNames: eventNames as any,
        })

        return NextResponse.json({
          success: true,
          ...result,
          taskId,
        })
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to replay events' },
          { status: 400 }
        )
      }
    }
  } catch (err) {
    console.error('[admin/events/replay] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET — Get event timeline for a task (view only, no replay)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string | null } | null

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId query parameter required' },
        { status: 400 }
      )
    }

    const timeline = await eventReplay.getTaskTimeline(taskId)

    return NextResponse.json({
      success: true,
      taskId,
      events: timeline,
      count: timeline.length,
    })
  } catch (err) {
    console.error('[admin/events/replay] GET error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
