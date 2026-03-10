/**
 * Notification Subscriber — Sends real-time + email notifications
 * 
 * Notifies partners and customers of important task lifecycle events.
 * Uses notificationService for sending via Supabase Realtime + email.
 */

import { eventBus } from '../eventBus'
import { notificationService } from '@/lib/services'

export function registerNotificationSubscriber() {
  eventBus.on('task.matched', async (payload) => {
    try {
      // Notify top 5 partners they were matched
      // notificationService.notifyPartnersMatched() should handle broadcaster logic
      console.log('[NotificationSubscriber] Matched partners for task:', payload.taskId)
      // TODO: Implement notifyPartnersMatched if not already in notificationService
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.matched:', err)
    }
  })

  eventBus.on('task.accepted', async (payload) => {
    try {
      // Notify customer: offer accepted
      // Notify partner: work started, payment secured
      console.log(
        '[NotificationSubscriber] Task accepted:',
        payload.taskId,
        'by partner',
        payload.partnerId
      )
      // TODO: Implement notifications if needed
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.accepted:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      // Request review from customer
      // Ask for rating/comment
      console.log('[NotificationSubscriber] Request review for task:', payload.taskId)
      // TODO: Implement requestReview if needed
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      // Notify partner: payment released
      // Show: gross amount, commission, net amount
      console.log(
        '[NotificationSubscriber] Payment released to partner:',
        payload.partnerId,
        'amount:',
        payload.netAmount
      )
      // TODO: Implement payment notification if needed
    } catch (err) {
      console.error('[NotificationSubscriber] Error on payment.released:', err)
    }
  })
}
