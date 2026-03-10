/**
 * Event Bus — Central pub/sub system for task + payment lifecycle events
 * 
 * Subscribers register listeners for specific events.
 * When events are emitted, all subscribers are notified in parallel.
 * Events are logged to event_log table for audit trail + analytics.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { EventName, EventPayload, LiftGOEvents } from './eventTypes'

type Handler<T extends EventName> = (payload: EventPayload<T>) => Promise<void>

class EventBus {
  private handlers = new Map<EventName, Handler<any>[]>()

  /**
   * Register a handler for a specific event
   */
  on<T extends EventName>(event: T, handler: Handler<T>): void {
    const existing = this.handlers.get(event) ?? []
    this.handlers.set(event, [...existing, handler])
  }

  /**
   * Emit an event — async, non-blocking
   * 
   * 1. Log to event_log table (audit trail)
   * 2. Dispatch all subscribers in parallel (Promise.allSettled)
   * 3. Don't wait for subscribers — emit returns immediately
   * 
   * Errors in any subscriber don't affect others or the main flow.
   */
  async emit<T extends EventName>(
    event: T,
    payload: EventPayload<T>
  ): Promise<void> {
    // Fire-and-forget for non-blocking behavior
    Promise.resolve()
      .then(() => this.logEvent(event, payload))
      .then(() => this.dispatchHandlers(event, payload))
      .catch(err => {
        console.error('[EventBus] Error in event dispatch:', err)
      })
  }

  /**
   * Dispatch event to all registered handlers in parallel
   * 
   * Uses Promise.allSettled so one handler's error doesn't affect others.
   */
  private async dispatchHandlers<T extends EventName>(
    event: T,
    payload: EventPayload<T>
  ): Promise<void> {
    const handlers = this.handlers.get(event) ?? []

    if (handlers.length === 0) {
      return
    }

    await Promise.allSettled(
      handlers.map(handler =>
        handler(payload).catch(err => {
          console.error(`[EventBus] Handler error for ${event}:`, err)
        })
      )
    )
  }

  /**
   * Log event to audit trail
   * Errors don't block event dispatch.
   */
  private async logEvent(event: EventName, payload: unknown): Promise<void> {
    try {
      const supabase = createAdminClient()
      await supabase.from('event_log').insert({
        event_name: event,
        payload: payload as Record<string, unknown>,
        emitted_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[EventBus] Failed to log event:', err)
    }
  }
}

// Singleton instance
export const eventBus = new EventBus()
