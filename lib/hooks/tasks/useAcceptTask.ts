/**
 * Accept Task Hook
 * 
 * Worker accepts claimed task and is en route
 * Transitions: claimed → accepted
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import { assertTransition } from '@/lib/guards/state-machine-guard'
import type { Task, AcceptTaskParams } from '@/lib/task-engine/types'

interface UseAcceptTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useAcceptTask(options?: UseAcceptTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('accept_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const acceptTask = useCallback(
    async (taskId: string) => {
      try {
        // 1. Validate state transition
        await assertTransition('task', taskId, 'accepted')

        // 2. Call RPC
        const params: AcceptTaskParams = {
          task_id: taskId,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error accepting task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    acceptTask,
    ...rpc,
  }
}
