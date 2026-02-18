import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Supported analytics event names for LiftGO
 */
export type EventName =
  | 'inquiry_submitted'
  | 'offer_sent'
  | 'offer_accepted'
  | 'payment_completed'
  | 'search_performed'
  | 'craftworker_profile_viewed'
  | 'user_registered'
  | 'user_logged_in'
  | 'review_submitted'
  | 'notification_clicked'
  | 'api_error'

interface AnalyticsEvent {
  eventName: EventName
  properties?: Record<string, any>
  userId?: string
  sessionId: string
  platform?: string
  appVersion?: string
  timestamp: Date
}

/**
 * Analytics tracker with batching and fire-and-forget semantics.
 * Singleton pattern ensures events are buffered and flushed automatically.
 */
class Analytics {
  private buffer: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private readonly FLUSH_INTERVAL = 5000 // 5 seconds
  private readonly MAX_BUFFER_SIZE = 20
  private isFlushing = false

  /**
   * Track an event. Never throws - fire and forget.
   */
  track(
    eventName: EventName,
    properties?: Record<string, any>,
    userId?: string,
    sessionId?: string,
    platform: string = 'web',
    appVersion?: string
  ): void {
    try {
      const event: AnalyticsEvent = {
        eventName,
        properties: properties || {},
        userId,
        sessionId: sessionId || this.generateSessionId(),
        platform,
        appVersion,
        timestamp: new Date(),
      }

      this.buffer.push(event)

      // Auto-flush if buffer is full
      if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
        this.flush()
      } else {
        // Schedule flush if not already scheduled
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => {
            this.flush()
          }, this.FLUSH_INTERVAL)
        }
      }
    } catch (error) {
      // Silent failure - never throw in analytics
      console.error('[Analytics] Track error:', error)
    }
  }

  /**
   * Flush buffered events to Supabase. Fire and forget.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return
    }

    this.isFlushing = true

    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Get events to flush
    const eventsToFlush = [...this.buffer]
    this.buffer = []

    try {
      const records = eventsToFlush.map((event) => ({
        user_id: event.userId || null,
        session_id: event.sessionId,
        event_name: event.eventName,
        properties: event.properties,
        platform: event.platform,
        app_version: event.appVersion || null,
        created_at: event.timestamp.toISOString(),
      }))

      const { error } = await supabaseAdmin
        .from('analytics_events')
        .insert(records)

      if (error) {
        console.error('[Analytics] Flush error:', error)
        // Don't retry - just log and continue
      }
    } catch (error) {
      console.error('[Analytics] Flush exception:', error)
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Generate a session ID (use client-side session storage in real apps)
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}

// Export singleton instance
export const analytics = new Analytics()
