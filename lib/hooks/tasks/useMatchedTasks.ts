/**
 * Matched Tasks Hook
 * 
 * Fetches and ranks qualified workers for a specific task based on
 * scoring algorithm and matching criteria.
 */

'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { scoreWorkers } from '@/lib/task-engine/scoring'
import { filterQualifiedWorkers, getTopMatches } from '@/lib/task-engine/matching-utils'
import type { MatchScore, MatchedWorker, WorkerStats, Task } from '@/lib/task-engine/types'

interface UseMatchedTasksOptions {
  limit?: number
  autoLoad?: boolean
  onSuccess?: (workers: MatchedWorker[]) => void
  onError?: (error: any) => void
}

export function useMatchedTasks(taskId: string, options?: UseMatchedTasksOptions) {
  const [matchedWorkers, setMatchedWorkers] = useState<MatchedWorker[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [totalQualified, setTotalQualified] = useState(0)

  const limit = options?.limit || 5

  const loadMatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      console.log('[v0] Loading matched workers for task:', taskId)

      // Load task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      setTask(taskData)

      // Load all worker stats (in production, filter by category/location first)
      const { data: workerStats, error: statsError } = await supabase
        .from('worker_stats')
        .select('*')

      if (statsError) throw statsError

      if (!workerStats || workerStats.length === 0) {
        console.log('[v0] No workers found')
        setMatchedWorkers([])
        options?.onSuccess?.([])
        return
      }

      // Filter qualified workers
      const qualified = filterQualifiedWorkers(workerStats as WorkerStats[])
      setTotalQualified(qualified.length)

      // Score and rank workers
      const scores = scoreWorkers(qualified)
      const topMatches = getTopMatches(scores, limit)

      // Map to MatchedWorker objects
      const matched: MatchedWorker[] = topMatches.map((score: any) => {
        const stats = workerStats.find((w: any) => w.worker_id === score.worker_id) as WorkerStats

        return {
          worker_id: score.worker_id,
          score: score.score,
          reasons: score.reasons,
          match_rank: score.match_rank,
          stats,
        }
      })

      console.log(`[v0] Found ${matched.length} matched workers out of ${qualified.length} qualified`)

      setMatchedWorkers(matched)
      options?.onSuccess?.(matched)
    } catch (err) {
      console.error('[v0] Error loading matched workers:', err)
      setError(err)
      options?.onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [taskId, limit, options])

  const refetch = useCallback(() => {
    loadMatches()
  }, [loadMatches])

  // Auto-load on mount if enabled
  React.useEffect(() => {
    if (options?.autoLoad !== false) {
      loadMatches()
    }
  }, [loadMatches, options?.autoLoad])

  return {
    matchedWorkers,
    topMatches: matchedWorkers.slice(0, 3), // Convenience property for top 3
    task,
    loading,
    error,
    totalQualified,
    refetch,
  }
}

// Add React import
import React from 'react'
