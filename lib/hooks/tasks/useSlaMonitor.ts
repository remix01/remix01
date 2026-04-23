/**
 * SLA Monitor Hook
 * 
 * Real-time monitoring of task SLA status and time remaining
 * Subscribes to task events and updates status continuously
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateTimeRemaining, getSLAStatus, isSLAWarning, calculateSLAUsagePercentage } from '@/lib/task-engine/sla-utils'
import type { Task, SLAMonitorInfo, SLAStatus } from '@/lib/task-engine/types'

interface UseSlaMonitorOptions {
  onWarning?: (taskId: string) => void
  onExpired?: (taskId: string) => void
  pollInterval?: number // milliseconds between polls
}

export function useSlaMonitor(taskId: string, options?: UseSlaMonitorOptions) {
  const [task, setTask] = useState<Task | null>(null)
  const [slaStatus, setSlaStatus] = useState<SLAStatus>('no_deadline')
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(null))
  const [isWarning, setIsWarning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [lastWarningTime, setLastWarningTime] = useState<number | null>(null)

  // Load initial task data
  const loadTask = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      if (!supabase) throw new Error('Supabase client not initialized')

      console.log('[v0] Loading task for SLA monitor:', taskId)

      const { data, error: queryError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (queryError) throw queryError

      setTask(data as unknown as Task)
    } catch (err) {
      console.error('[v0] Error loading task for SLA monitor:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Update SLA status based on current task
  const updateSLAStatus = useCallback(() => {
    if (!task) return

    const status = getSLAStatus(task)
    setSlaStatus(status)

    const remaining = calculateTimeRemaining(task.sla_deadline)
    setTimeRemaining(remaining)

    const warning = isSLAWarning(task.sla_deadline)
    setIsWarning(warning)

    // Emit warning callback if entering warning state
    if (warning && !lastWarningTime) {
      console.log('[v0] SLA warning triggered for task:', taskId)
      setLastWarningTime(Date.now())
      options?.onWarning?.(taskId)
    }

    // Emit expired callback if task is now expired
    if (remaining.isExpired && lastWarningTime) {
      console.log('[v0] Task SLA expired:', taskId)
      options?.onExpired?.(taskId)
    }
  }, [task, taskId, lastWarningTime, options])

  // Set up polling for time remaining updates
  useEffect(() => {
    const pollInterval = options?.pollInterval || 60000 // 1 minute default

    const interval = setInterval(() => {
      updateSLAStatus()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [updateSLAStatus, options?.pollInterval])

  // Subscribe to task realtime events
  useEffect(() => {
    if (!taskId) return

    let subscription: any = null

    const setupSubscription = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        console.log('[v0] Setting up SLA monitor subscription for task:', taskId)

        subscription = supabase
          .channel(`task:${taskId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tasks',
              filter: `id=eq.${taskId}`,
            },
            (payload: any) => {
              console.log('[v0] Task updated for SLA monitor:', payload)
              setTask(payload.new)
              // Update status on next tick after state is set
              setTimeout(updateSLAStatus, 0)
            }
          )
          .subscribe()
      } catch (err) {
        console.error('[v0] Error setting up SLA monitor subscription:', err)
      }
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [taskId, updateSLAStatus])

  // Load initial task and update status
  useEffect(() => {
    loadTask()
  }, [loadTask])

  // Update SLA status when task changes
  useEffect(() => {
    updateSLAStatus()
  }, [task, updateSLAStatus])

  const slaInfo: SLAMonitorInfo = {
    taskId,
    status: slaStatus,
    deadline: task?.sla_deadline || null,
    timeRemaining,
    usagePercentage: task ? calculateSLAUsagePercentage(task) : 0,
    isWarning,
  }

  return {
    task,
    ...slaInfo,
    loading,
    error,
    refetch: loadTask,
  }
}
