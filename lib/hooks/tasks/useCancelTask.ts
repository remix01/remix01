/**
 * Cancel Task Hook
 * 
 * Customer or admin cancels a task
 * Transitions: published/claimed/accepted/in_progress → cancelled
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import { assertTransition } from '@/lib/guards/state-machine-guard'
import type { Task, CancelTaskParams } from '@/lib/task-engine/types'

interface UseCancelTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useCancelTask(options?: UseCancelTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('cancel_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const cancelTask = useCallback(
    async (taskId: string, reason: string) => {
      try {
        // 1. Validate state transition
        await assertTransition('task', taskId, 'cancelled')

        // 2. Call RPC
        const params: CancelTaskParams = {
          task_id: taskId,
          reason,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error cancelling task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    cancelTask,
    ...rpc,
  }
}
