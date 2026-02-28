/**
 * Claim Task Hook
 * 
 * Worker claims a task to show intent to complete it
 * Transitions: published → claimed
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import type { Task, ClaimTaskParams } from '@/lib/task-engine/types'

interface UseClaimTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useClaimTask(options?: UseClaimTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('claim_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const claimTask = useCallback(
    async (taskId: string, workerId: string) => {
      try {
        // Call RPC directly - state machine validation happens in backend
        const params: ClaimTaskParams = {
          task_id: taskId,
          worker_id: workerId,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error claiming task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    claimTask,
    ...rpc,
  }
}
