/**
 * Publish Task Hook
 * 
 * Publishes a task to make it available for worker claims
 * Transitions: pending → published
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import { assertTransition } from '@/lib/guards/state-machine-guard'
import type { Task, PublishTaskParams } from '@/lib/task-engine/types'

interface UsePublishTaskOptions {
  onSuccess?: (task: Task) => void
  onError?: (error: any) => void
}

export function usePublishTask(options?: UsePublishTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('publish_task', {
    onSuccess: (result) => {
      if (result?.task) {
        options?.onSuccess?.(result.task)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const publishTask = useCallback(
    async (taskId: string, slaHours: number) => {
      try {
        // 1. Validate state transition
        await assertTransition('task', taskId, 'published')

        // 2. Call RPC
        const params: PublishTaskParams = {
          task_id: taskId,
          sla_hours: slaHours,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error publishing task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    publishTask,
    ...rpc,
  }
}
