/**
 * Assign Task Hook
 * 
 * Assigns a task to a worker with automatic scoring validation
 * Calls backend assign_task RPC with permission checks
 */

'use client'

import { useCallback } from 'react'
import { useTaskRpc } from './useTaskRpc'
import type { Task, AssignTaskParams } from '@/lib/task-engine/types'

interface UseAssignTaskOptions {
  onSuccess?: (task: Task, assignmentId: string) => void
  onError?: (error: any) => void
}

export function useAssignTask(options?: UseAssignTaskOptions) {
  const { execute, ...rpc } = useTaskRpc('assign_task', {
    onSuccess: (result) => {
      if (result?.task && result?.assignment_id) {
        options?.onSuccess?.(result.task, result.assignment_id)
      }
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  const assignTask = useCallback(
    async (taskId: string, workerId: string, autoAssign?: boolean) => {
      try {
        console.log('[v0] Assigning task to worker:', { taskId, workerId, autoAssign })

        const params: AssignTaskParams = {
          task_id: taskId,
          worker_id: workerId,
          auto_assign: autoAssign,
        }

        const result = await execute(params)
        return result
      } catch (error) {
        console.error('[v0] Error assigning task:', error)
        throw error
      }
    },
    [execute]
  )

  return {
    assignTask,
    ...rpc,
  }
}
