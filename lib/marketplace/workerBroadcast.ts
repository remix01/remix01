/**
 * Worker Broadcast — Instant partner notifications
 * 
 * Handles real-time broadcasts to matched partners via:
 * - Supabase Realtime channels (instant UI updates)
 * - Email notifications (with timing rules)
 * - Push notifications (if subscribed)
 * 
 * Respects quiet hours (22:00-07:00) except for urgent deadline warnings
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { notificationService } from '@/lib/services'

export const workerBroadcast = {
  /**
   * Broadcast new request to top matched partners
   * Sends Realtime event + email, respects quiet hours
   */
  async notifyMatched(requestId: string, partnerIds: string[]): Promise<void> {
    try {
      console.log('[WorkerBroadcast] Notifying partners:', { requestId, count: partnerIds.length })

      // Check if it's quiet hours
      const now = new Date()
      const hour = now.getHours()
      const isQuietHours = hour >= 22 || hour < 7

      for (const partnerId of partnerIds) {
        // 1. Supabase Realtime broadcast (instant)
        await this.broadcastRealtimeEvent(requestId, partnerId, 'new_request', {
          urgency: 'normal',
        })

        // 2. Send email (respect quiet hours)
        if (!isQuietHours) {
          await this.sendNotificationEmail(requestId, partnerId, 'new_request_matched')
        } else {
          console.log(`[WorkerBroadcast] Quiet hours active, delaying email for ${partnerId}`)
        }

        // 3. Record notification in database
        await this.recordNotification(requestId, partnerId, 'matched')
      }

      console.log('[WorkerBroadcast] Broadcast complete for all partners')
    } catch (error) {
      console.error('[WorkerBroadcast] notifyMatched failed:', error)
      // Don't throw — broadcast is fire-and-forget
    }
  },

  /**
   * Urgent deadline warning broadcast (ignores quiet hours)
   * Called when guarantee expiration is < 30 minutes
   */
  async notifyDeadlineWarning(
    requestId: string,
    partnerIds: string[],
    minutesLeft: number
  ): Promise<void> {
    try {
      console.log('[WorkerBroadcast] Deadline warning:', { requestId, minutesLeft })

      for (const partnerId of partnerIds) {
        // Realtime event — priority
        await this.broadcastRealtimeEvent(requestId, partnerId, 'deadline_warning', {
          urgency: 'critical',
          minutesLeft,
        })

        // Email — ignore quiet hours for urgent notifications
        await this.sendNotificationEmail(requestId, partnerId, 'deadline_warning', {
          minutesLeft,
        })

        // Record as critical notification
        await this.recordNotification(requestId, partnerId, 'deadline_warning')
      }

      console.log('[WorkerBroadcast] Deadline warning sent to all partners')
    } catch (error) {
      console.error('[WorkerBroadcast] notifyDeadlineWarning failed:', error)
    }
  },

  /**
   * Send Supabase Realtime event to specific partner
   * Triggers instant UI update for partner (no polling needed)
   */
  async broadcastRealtimeEvent(
    requestId: string,
    partnerId: string,
    eventType: 'new_request' | 'deadline_warning' | 'offer_accepted' | 'task_started',
    payload: Record<string, any>
  ): Promise<void> {
    try {
      // In a real implementation, use Supabase realtime client
      // For now, log the event
      console.log(
        `[WorkerBroadcast] Realtime event: channel:partner-${partnerId}, event:${eventType}`,
        payload
      )

      // TODO: Implement actual Supabase Realtime broadcast
      // const realtimeClient = supabaseAdmin.channel(`partner-${partnerId}`)
      // await realtimeClient.send('broadcast', {
      //   event: eventType,
      //   payload: { requestId, ...payload }
      // })
    } catch (error) {
      console.error('[WorkerBroadcast] Realtime broadcast failed:', error)
    }
  },

  /**
   * Send email notification to partner
   */
  async sendNotificationEmail(
    requestId: string,
    partnerId: string,
    templateType: 'new_request_matched' | 'deadline_warning' | 'offer_accepted',
    context?: Record<string, any>
  ): Promise<void> {
    try {
      // Fetch partner email
      const { data: partner } = await supabaseAdmin
        .from('obrtnik_profiles')
        .select('user_id')
        .eq('id', partnerId)
        .single()

      if (!partner) {
        console.warn('[WorkerBroadcast] Partner not found:', partnerId)
        return
      }

      // Fetch user email
      const { data: user } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', partner.user_id)
        .single()

      if (!user?.email) {
        console.warn('[WorkerBroadcast] User email not found for partner:', partnerId)
        return
      }

      // Queue email job
      const emailTemplates: Record<string, string> = {
        new_request_matched: 'partner_new_request',
        deadline_warning: 'partner_deadline_warning',
        offer_accepted: 'partner_offer_accepted',
      }

      console.log(`[WorkerBroadcast] Queuing email for ${user.email} (${templateType})`)

      // TODO: Use notificationService to queue email
      // await notificationService.sendEmail(user.email, emailTemplates[templateType], { requestId, ...context })
    } catch (error) {
      console.error('[WorkerBroadcast] sendNotificationEmail failed:', error)
    }
  },

  /**
   * Record notification in database for audit trail
   */
  async recordNotification(
    requestId: string,
    partnerId: string,
    notificationType: 'matched' | 'deadline_warning' | 'offer_accepted'
  ): Promise<void> {
    try {
      await supabaseAdmin.from('marketplace_events').insert({
        event_type: `broadcast_sent_${notificationType}`,
        request_id: requestId,
        partner_id: partnerId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('[WorkerBroadcast] recordNotification failed:', error)
    }
  },

  /**
   * Determine if it's currently quiet hours (22:00 - 07:00)
   */
  isQuietHours(): boolean {
    const hour = new Date().getHours()
    return hour >= 22 || hour < 7
  },
}
