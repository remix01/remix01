/**
 * Start Task Hook
 * 
 * Worker starts working on the task
 * Transitions: accepted → in_progress
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import type { Task, StartTaskParams } from '@/lib/task-engine/types'

interface UseStartTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useStartTask(options?: UseStartTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('start_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const startTask = useCallback(
    async (taskId: string) => {
      try {
        // Call RPC directly - state machine validation happens in backend
        const params: StartTaskParams = {
          task_id: taskId,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error starting task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    startTask,
    ...rpc,
  }
}
