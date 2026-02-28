/**
 * POST /api/tasks/[id]/publish
 * 
 * Publish a task to make it available for worker claims
 * Requires: Admin or task owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { slaHours = 24 } = await request.json()

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Basic permission check - user must be authenticated
    // Note: Full permission system checks task ownership in backend RPC
    // The RPC function `publish_task` will validate ownership in the database

    // 3. Validate state transition - Note: Task states are not in the state machine yet
    // For now, we skip this check. When task entity is added to state-machine, uncomment:
    // try {
    //   await assertTransition('task', params.id, 'published', 'api-publish-task')
    // } catch (error) {
    //   return NextResponse.json(
    //     { error: 'Invalid task state transition' },
    //     { status: 400 }
    //   )
    // }

    // 4. Call RPC
    const { data, error } = await supabase.rpc('publish_task', {
      task_id: params.id,
      sla_hours: slaHours,
    })

    if (error) {
      console.error('[v0] RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
