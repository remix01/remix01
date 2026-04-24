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

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eventReplay } from '@/lib/events/eventReplay'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return fail('Unauthorized', 401)
    }

    // Check admin role
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Admin access required', 403)
    }

    const body = await request.json()
    const { taskId, eventLogId, dryRun, fromDate, eventNames } = body

    // Validate input
    if (!taskId && !eventLogId) {
      return fail('Either taskId or eventLogId required', 400)
    }

    // Replay by single event ID
    if (eventLogId) {
      try {
        await eventReplay.replayById(eventLogId)
        return ok({
          success: true,
          message: 'Event replayed successfully',
          eventLogId,
        })
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to replay event', 400)
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

        return ok({
          success: true,
          ...result,
          taskId,
        })
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to replay events', 400)
      }
    }
  } catch (err) {
    console.error('[admin/events/replay] error:', err)
    return fail('Internal server error', 500)
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
      return fail('Unauthorized', 401)
    }

    // Check admin role
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Admin access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return fail('taskId query parameter required', 400)
    }

    const timeline = await eventReplay.getTaskTimeline(taskId)

    return ok({
      success: true,
      taskId,
      events: timeline,
      count: timeline.length,
    })
  } catch (err) {
    console.error('[admin/events/replay] GET error:', err)
    return fail('Internal server error', 500)
  }
}
