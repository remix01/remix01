/**
 * Expire Task Hook
 * 
 * Expires a task (marks as expired due to SLA deadline passing)
 * Transitions: any → expired (enforced by backend state machine)
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import type { Task, ExpireTaskParams } from '@/lib/task-engine/types'

interface UseExpireTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function useExpireTask(options?: UseExpireTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('expire_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const expireTask = useCallback(
    async (taskId: string, reason?: string) => {
      try {
        const params: ExpireTaskParams = {
          task_id: taskId,
          reason: reason || 'SLA deadline passed',
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error expiring task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    expireTask,
    ...rpc,
  }
}
