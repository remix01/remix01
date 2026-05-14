import { getErrorMessage } from '@/lib/utils/error'
/**
 * GET /api/tasks/filter
 * 
 * Query tasks with advanced filtering
 * Query params: type=my_tasks|available|overdue|completed|all
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TaskFilterType } from '@/lib/task-engine/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams
    const filterType = (searchParams.get('type') || 'all') as TaskFilterType
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // 3. Map filter type to RPC parameters
    let p_status: string | undefined
    let p_assigned_to: string | undefined
    if (filterType === 'my_tasks') {
      p_assigned_to = user.id
    } else if (filterType === 'available') {
      p_status = 'open'
    } else if (filterType === 'completed') {
      p_status = 'completed'
    } else if (filterType === 'overdue') {
      p_status = 'expired'
    }

    const { data, error } = await supabase.rpc('filter_tasks', {
      p_status,
      p_assigned_to,
      p_limit: limit,
    })

    if (error) {
      console.error('[v0] RPC error:', error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 })
    }

    return NextResponse.json({ tasks: data || [] })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
