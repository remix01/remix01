/**
 * Event Replay — Debug tool for replaying events from event_log
 * 
 * Useful for debugging production issues:
 * 1. Replay all events for a task to see exact flow
 * 2. Replay from specific date to test recent changes
 * 3. Dry-run to inspect without dispatching
 */

import { createAdminClient } from '@/lib/supabase/server'
import { eventBus } from './eventBus'
import type { EventName } from './eventTypes'

export const eventReplay = {
  /**
   * Replay all events for a task in chronological order
   * Useful for debugging production issues
   */
  async replayForTask(
    taskId: string,
    options?: {
      fromDate?: Date
      eventNames?: EventName[]
      dryRun?: boolean
    }
  ) {
    const supabase = createAdminClient()

    let query = supabase
      .from('event_log')
      .select('*')
      .contains('payload', { taskId })
      .order('emitted_at', { ascending: true })

    if (options?.fromDate) {
      query = query.gte('emitted_at', options.fromDate.toISOString())
    }

    if (options?.eventNames?.length) {
      query = query.in('event_name', options.eventNames)
    }

    const { data: events, error } = await query

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    if (!events?.length) {
      return { replayed: 0, events: [] }
    }

    // Dry-run: just show events without dispatching
    if (options?.dryRun) {
      return {
        replayed: 0,
        dryRun: true,
        events: events.map(e => ({
          name: e.event_name,
          at: e.emitted_at,
          payload: e.payload,
        })),
      }
    }

    // Replay in chronological order with small delay between events
    let replayed = 0
    for (const ev of events) {
      try {
        await eventBus.dispatchHandlers(
          ev.event_name as EventName,
          ev.payload as any
        )
        replayed++
        // Small pause to avoid overwhelming subscribers
        await new Promise(r => setTimeout(r, 50))
      } catch (err) {
        console.error(`[EventReplay] Error replaying event ${ev.event_name}:`, err)
        // Continue with next event
      }
    }

    return {
      replayed,
      events: events.map(e => e.event_name),
    }
  },

  /**
   * Replay a single event by its ID from event_log
   */
  async replayById(eventLogId: string): Promise<void> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('event_log')
      .select('*')
      .eq('id', eventLogId)
      .single()

    if (error || !data) {
      throw new Error('Event not found in log')
    }

    await eventBus.dispatchHandlers(
      data.event_name as EventName,
      data.payload as any
    )
  },

  /**
   * Get complete timeline of all events for a task
   * Returns events in chronological order
   */
  async getTaskTimeline(taskId: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('event_log')
      .select('id, event_name, emitted_at, payload')
      .contains('payload', { taskId })
      .order('emitted_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch timeline: ${error.message}`)
    }

    return data ?? []
  },
}
