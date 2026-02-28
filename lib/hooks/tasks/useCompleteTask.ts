/**
 * Complete Task Hook
 * 
 * Worker marks task as complete
 * Transitions: in_progress → completed
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import { assertTransition } from '@/lib/guards/state-machine-guard'
import type { Task, CompleteTaskParams } from '@/lib/task-engine/types'

interface UseCompleteTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useCompleteTask(options?: UseCompleteTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('complete_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const completeTask = useCallback(
    async (taskId: string, notes?: string) => {
      try {
        // 1. Validate state transition
        await assertTransition('task', taskId, 'completed')

        // 2. Call RPC
        const params: CompleteTaskParams = {
          task_id: taskId,
          notes,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error completing task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    completeTask,
    ...rpc,
  }
}
