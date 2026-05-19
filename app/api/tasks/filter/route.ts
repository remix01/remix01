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

    // 3. Query tasks based on filter type
    let query = supabase.from('tasks').select('*')

    if (filterType === 'my_tasks') {
      query = query.eq('customer_id', user.id)
    } else if (filterType === 'available') {
      query = query.eq('status', 'published')
    } else if (filterType === 'overdue') {
      query = query.lt('expires_at', new Date().toISOString()).not('status', 'in', '("completed","expired","cancelled")')
    } else if (filterType === 'completed') {
      query = query.eq('status', 'completed')
    }
    // 'all' returns everything

    const { data, error } = await query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Query error:', error)
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
