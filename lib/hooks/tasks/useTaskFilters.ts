/**
 * Task Filters Hook
 * 
 * Filters and queries tasks based on:
 * - Status (my_tasks, available, overdue, completed)
 * - Priority
 * - Category
 * - User ownership
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskFilter, TaskFilterType, TaskQueryResult } from '@/lib/task-engine/types'

interface UseTaskFiltersOptions {
  limit?: number
  offset?: number
  autoLoad?: boolean
}

export function useTaskFilters(filterType: TaskFilterType, options?: UseTaskFiltersOptions) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const limit = options?.limit || 20
  const offset = options?.offset || 0

  const buildFilter = useCallback((): TaskFilter => {
    switch (filterType) {
      case 'my_tasks':
        return {
          type: 'my_tasks',
          status: ['published', 'claimed', 'accepted', 'in_progress'],
          limit,
          offset,
        }

      case 'available':
        return {
          type: 'available',
          status: ['published'],
          limit,
          offset,
        }

      case 'overdue':
        return {
          type: 'overdue',
          status: ['claimed', 'accepted', 'in_progress'],
          limit,
          offset,
        }

      case 'completed':
        return {
          type: 'completed',
          status: ['completed'],
          limit,
          offset,
        }

      case 'all':
      default:
        return {
          type: 'all',
          limit,
          offset,
        }
    }
  }, [filterType, limit, offset])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      console.log('[v0] Loading tasks with filter:', filterType)

      // For now, use simple query
      // In production, use an RPC function or API route for complex filtering
      let query = supabase.from('tasks').select('*', { count: 'exact' })

      // Apply filter based on type
      switch (filterType) {
        case 'my_tasks':
          query = query.in('status', ['published', 'claimed', 'accepted', 'in_progress'])
          break

        case 'available':
          query = query.eq('status', 'published')
          break

        case 'overdue':
          query = query.in('status', ['claimed', 'accepted', 'in_progress'])
            .lt('sla_deadline', new Date().toISOString())
          break

        case 'completed':
          query = query.eq('status', 'completed')
          break
      }

      // Apply pagination
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      const { data, error: queryError, count } = await query

      if (queryError) {
        throw queryError
      }

      setTasks(data || [])
      setTotalCount(count || 0)
      setHasMore((offset + limit) < (count || 0))
    } catch (err) {
      console.error('[v0] Error loading tasks:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [filterType, limit, offset])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (options?.autoLoad !== false) {
      loadTasks()
    }
  }, [loadTasks, options?.autoLoad])

  const loadMore = useCallback(async () => {
    // Load next page
    const nextOffset = offset + limit
    setLoading(true)

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      let query = supabase.from('tasks').select('*')

      // Apply same filter
      switch (filterType) {
        case 'my_tasks':
          query = query.in('status', ['published', 'claimed', 'accepted', 'in_progress'])
          break
        case 'available':
          query = query.eq('status', 'published')
          break
        case 'overdue':
          query = query.in('status', ['claimed', 'accepted', 'in_progress'])
            .lt('sla_deadline', new Date().toISOString())
          break
        case 'completed':
          query = query.eq('status', 'completed')
          break
      }

      const { data, error: queryError } = await query
        .range(nextOffset, nextOffset + limit - 1)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setTasks(prev => [...prev, ...(data || [])])
      setHasMore(tasks.length + (data?.length || 0) < totalCount)
    } catch (err) {
      console.error('[v0] Error loading more tasks:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [filterType, limit, offset, tasks.length, totalCount])

  return {
    tasks,
    loading,
    error,
    totalCount,
    hasMore,
    loadTasks,
    loadMore,
  }
}
