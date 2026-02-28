/**
 * GET /api/tasks/filter
 * 
 * Query tasks with advanced filtering
 * Query params: type=my_tasks|available|overdue|completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/layers/permission-layer'

type FilterType = 'my_tasks' | 'available' | 'overdue' | 'completed' | 'all'

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
    const filterType = (searchParams.get('type') || 'my_tasks') as FilterType
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const priority = searchParams.get('priority') || null
    const category = searchParams.get('category') || null

    console.log('[v0] Filtering tasks:', {
      type: filterType,
      limit,
      offset,
      priority,
      category,
    })

    // 3. Build query
    let query = supabase.from('tasks').select('*', { count: 'exact' })

    // Apply filter based on type
    switch (filterType) {
      case 'my_tasks':
        query = query.or(`customer_id.eq.${user.id},worker_id.eq.${user.id}`)
        break

      case 'available':
        query = query.eq('status', 'published')
        break

      case 'overdue':
        query = query
          .in('status', ['claimed', 'accepted', 'in_progress'])
          .lt('sla_deadline', new Date().toISOString())
        break

      case 'completed':
        query = query.eq('status', 'completed')
        break

      case 'all':
      default:
        // No additional filter
        break
    }

    // Apply optional filters
    if (priority) {
      query = query.eq('priority', priority)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('[v0] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      tasks: data || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0),
      limit,
      offset,
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
