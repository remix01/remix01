/**
 * Task Events Realtime Hook
 * 
 * Subscribes to task_events table for real-time task updates.
 * Uses Supabase Realtime with postgres_changes.
 */

'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskEvent } from '@/lib/task-engine/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseTaskEventsOptions {
  taskId?: string
  userId?: string
  onTaskUpdate?: (task: Task) => void
  onTaskDelete?: (taskId: string) => void
  onError?: (error: any) => void
}

export function useTaskEvents(options?: UseTaskEventsOptions) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<any>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      console.warn('[v0] Supabase client not initialized')
      return
    }

    const subscribeToTaskEvents = async () => {
      try {
        // Build filter: listen to all task_events or filter by specific task/user
        let filter = `event_type=eq.UPDATE`

        if (options?.taskId) {
          filter += `.and(record->id.eq.${options.taskId})`
        }

        if (options?.userId) {
          filter += `.or(customer_id.eq.${options.userId},worker_id.eq.${options.userId})`
        }

        console.log('[v0] Subscribing to task_events with filter:', filter)

        const channel = supabase
          .channel('task-events')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_events',
              filter,
            },
            (payload: any) => {
              console.log('[v0] Task event received:', payload)

              if (payload.new && options?.onTaskUpdate) {
                options.onTaskUpdate(payload.new as Task)
              }

              if (payload.eventType === 'DELETE' && options?.onTaskDelete) {
                options.onTaskDelete(payload.old?.id)
              }
            }
          )
          .subscribe(async (status) => {
            console.log('[v0] Task events subscription status:', status)
            if (status === 'SUBSCRIBED') {
              setIsSubscribed(true)
              setError(null)
            } else if (status === 'CHANNEL_ERROR') {
              const err = new Error('Failed to subscribe to task events')
              setError(err)
              options?.onError?.(err)
            }
          })

        channelRef.current = channel

        return () => {
          channel.unsubscribe()
          setIsSubscribed(false)
        }
      } catch (err) {
        console.error('[v0] Error subscribing to task events:', err)
        setError(err)
        options?.onError?.(err)
      }
    }

    subscribeToTaskEvents()

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        setIsSubscribed(false)
      }
    }
  }, [options?.taskId, options?.userId, options])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      setIsSubscribed(false)
    }
  }, [])

  return {
    isSubscribed,
    error,
    unsubscribe,
  }
}
