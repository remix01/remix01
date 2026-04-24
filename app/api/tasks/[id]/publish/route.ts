import { getErrorMessage } from '@/lib/utils/error'
/**
 * POST /api/tasks/[id]/publish
 * 
 * Publish a task to make it available for worker claims
 * Requires: Task owner or admin
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const [{ id: taskId }, { slaHours = 24 }] = await Promise.all([params, request.json()])

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // 2. Call RPC function - permission and state validation happens in backend
    const { data, error } = await supabase.rpc('publish_task', {
      task_id: taskId,
      sla_hours: slaHours,
    })

    if (error) {
      console.error('[v0] RPC error:', error)
      return fail(getErrorMessage(error), 400)
    }

    return Response.json(data)
  } catch (error) {
    console.error('[v0] API error:', error)
    return fail(error instanceof Error ? error.message : 'Internal server error', 500)
  }
}
