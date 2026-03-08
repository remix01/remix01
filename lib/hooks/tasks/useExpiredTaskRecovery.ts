/**
 * Expired Task Recovery Hook
 * 
 * Handles recovery of expired tasks by finding replacement workers
 * and triggering re-assignment workflow
 */

'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMatchedTasks } from './useMatchedTasks'
import { useAssignTask } from './useAssignTask'
import type { Task, MatchedWorker } from '@/lib/task-engine/types'

interface UseExpiredTaskRecoveryOptions {
  onRecoveryStart?: (taskId: string) => void
  onRecoverySuccess?: (taskId: string, workerId: string) => void
  onRecoveryFailed?: (taskId: string, reason: string) => void
}

export function useExpiredTaskRecovery(taskId: string, options?: UseExpiredTaskRecoveryOptions) {
  const [recovering, setRecovering] = useState(false)
  const [error, setError] = useState<any>(null)
  const [selectedWorker, setSelectedWorker] = useState<MatchedWorker | null>(null)
  const [recoveryAttempts, setRecoveryAttempts] = useState(0)

  const { matchedWorkers, loading: matchesLoading } = useMatchedTasks(taskId, {
    autoLoad: false,
  })

  const { assignTask: performAssign, loading: assignLoading } = useAssignTask()

  const findReplacementWorkers = useCallback(async () => {
    try {
      setRecovering(true)
      setError(null)

      console.log('[v0] Finding replacement workers for expired task:', taskId)

      // This uses the useMatchedTasks hook above
      // In real scenario, would call refetch on useMatchedTasks
      // For now, just trigger loading of matches

      options?.onRecoveryStart?.(taskId)
    } catch (err) {
      console.error('[v0] Error finding replacement workers:', err)
      setError(err)
      options?.onRecoveryFailed?.(taskId, 'Failed to find replacement workers')
    } finally {
      setRecovering(false)
    }
  }, [taskId, options])

  const reassignToWorker = useCallback(
    async (worker: MatchedWorker) => {
      try {
        setRecovering(true)
        setError(null)
        setSelectedWorker(worker)
        setRecoveryAttempts(prev => prev + 1)

        console.log('[v0] Re-assigning expired task to worker:', {
          taskId,
          workerId: worker.worker_id,
          score: worker.score,
        })

        // Call assign_task with auto_assign flag to indicate this is recovery
        const result = await performAssign(taskId, worker.worker_id, true)

        console.log('[v0] Task successfully reassigned:', result)

        options?.onRecoverySuccess?.(taskId, worker.worker_id)

        return result
      } catch (err) {
        console.error('[v0] Error reassigning task:', err)
        setError(err)
        options?.onRecoveryFailed?.(taskId, `Failed to assign to worker: ${err instanceof Error ? err.message : 'Unknown error'}`)
        throw err
      } finally {
        setRecovering(false)
      }
    },
    [taskId, performAssign, options]
  )

  const getRecoveryStatus = useCallback(() => {
    return {
      recovering,
      error,
      selectedWorker,
      recoveryAttempts,
      hasMatches: matchedWorkers.length > 0,
      matchesLoading,
      isAssigning: assignLoading,
    }
  }, [recovering, error, selectedWorker, recoveryAttempts, matchedWorkers.length, matchesLoading, assignLoading])

  return {
    findReplacementWorkers,
    reassignToWorker,
    getRecoveryStatus: getRecoveryStatus(),
    matchedWorkers,
    selectedWorker,
    recovering,
    error,
  }
}
