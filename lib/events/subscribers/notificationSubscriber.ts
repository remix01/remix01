/**
 * Notification Subscriber — Sends real-time + email notifications
 * 
 * Pattern:
 * 1. Check idempotency — skip if already processed
 * 2. Fetch detailed data from DB (names, emails, task details)
 * 3. Send notifications via notificationService
 */

import { eventBus } from '../eventBus'
import { notificationService } from '@/lib/services'
import { idempotency } from '../idempotency'
import { createAdminClient } from '@/lib/supabase/server'

export function registerNotificationSubscriber() {
  eventBus.on('task.matched', async (payload) => {
    try {
      // Idempotency: skip if already notified
      const skip = await idempotency.checkAndMark('task.matched', 'notify', payload.taskId)
      if (skip) return

      // Fetch matched partners from DB
      const supabase = createAdminClient()
      const { data: partners } = await supabase
        .from('obrtnik_profiles')
        .select('id, ime, email, telefon')
        .in('id', payload.matchIds)

      if (!partners?.length) return

      // Notify partners — via Realtime + email
      await notificationService.notifyPartnersMatched(
        payload.taskId,
        partners,
        payload.deadlineAt
      )
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.matched:', err)
    }
  })

  eventBus.on('task.accepted', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.accepted', 'notify', payload.taskId)
      if (skip) return

      // Fetch customer + partner details
      const supabase = createAdminClient()
      const [{ data: customer }, { data: partner }] = await Promise.all([
        supabase.from('profiles').select('email, ime').eq('id', payload.customerId).single(),
        supabase.from('obrtnik_profiles').select('email, ime').eq('id', payload.partnerId).single(),
      ])

      if (!customer || !partner) return

      await notificationService.notifyAccepted(payload.taskId, customer, partner)
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.accepted:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'notify', payload.taskId)
      if (skip) return

      await notificationService.requestReview(payload.taskId, payload.customerId, payload.partnerId)
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('payment.released', 'notify', payload.taskId)
      if (skip) return

      await notificationService.notifyPaymentReleased(payload.partnerId, payload.netAmount, payload.taskId)
    } catch (err) {
      console.error('[NotificationSubscriber] Error on payment.released:', err)
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('offer.sent', 'notify', payload.taskId)
      if (skip) return

      await notificationService.notifyOfferReceived(payload.taskId, payload.partnerId)
    } catch (err) {
      console.error('[NotificationSubscriber] Error on offer.sent:', err)
    }
  })

  eventBus.on('review.submitted', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('review.submitted', 'notify', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      const { data: partner } = await supabase
        .from('obrtnik_profiles')
        .select('email, ime')
        .eq('id', payload.partnerId)
        .single()

      if (!partner) return

      await notificationService.notifyReviewSubmitted(payload.taskId, partner, payload.rating)
    } catch (err) {
      console.error('[NotificationSubscriber] Error on review.submitted:', err)
    }
  })
}
