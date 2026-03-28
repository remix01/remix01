// @ts-nocheck
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
import { sendBusinessEvent } from '@/lib/slack'

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
      await (notificationService as any).notifyPartnersMatched(
        payload.taskId,
        partners,
        payload.deadlineAt
      )

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'novo_narocilo',
        title: 'Nova naloga — ujemanje obrtnikov',
        details: {
          'Naloga ID': payload.taskId,
          'Ujemanja': partners.length,
          'Rok': payload.deadlineAt
            ? new Date(payload.deadlineAt).toLocaleString('sl-SI', { timeZone: 'Europe/Ljubljana' })
            : 'ni določen',
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack task.matched failed:', err))
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
      const [{ data: customerData }, { data: partner }] = await Promise.all([
        supabase.from('profiles').select('email, ime').eq('id', payload.customerId).single(),
        supabase.from('obrtnik_profiles').select('email, ime').eq('id', payload.partnerId).single(),
      ])
      const customer = customerData as { email: string | null; ime: string | null } | null

      if (!customer || !partner) return

      await (notificationService as any).notifyAccepted(payload.taskId, customer, partner)

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'ponudba_sprejeta',
        title: 'Ponudba sprejeta',
        details: {
          'Naloga ID': payload.taskId,
          'Obrtnik': partner.ime ?? 'Unknown',
          'Naročnik': customer.ime ?? 'Unknown',
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack task.accepted failed:', err))
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.accepted:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'notify', payload.taskId)
      if (skip) return

      await (notificationService as any).requestReview(payload.taskId, payload.customerId, payload.partnerId)

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'nova_ocena',
        title: 'Naloga dokončana — čakanje na oceno',
        details: {
          'Naloga ID': payload.taskId,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack task.completed failed:', err))
    } catch (err) {
      console.error('[NotificationSubscriber] Error on task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('payment.released', 'notify', payload.taskId)
      if (skip) return

      await (notificationService as any).notifyPaymentReleased(payload.partnerId, payload.netAmount, payload.taskId)

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'placilo_prejeto',
        title: 'Plačilo izvršeno',
        details: {
          'Naloga ID': payload.taskId,
          'Znesek': `€${(payload.netAmount / 100).toFixed(2)}`,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack payment.released failed:', err))
    } catch (err) {
      console.error('[NotificationSubscriber] Error on payment.released:', err)
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('offer.sent', 'notify', payload.taskId)
      if (skip) return

      await (notificationService as any).notifyOfferReceived(payload.taskId, payload.partnerId)

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'nova_ponudba',
        title: 'Nova ponudba za nalogo',
        details: {
          'Naloga ID': payload.taskId,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack offer.sent failed:', err))
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

      await (notificationService as any).notifyReviewSubmitted(payload.taskId, partner, payload.rating)

      // Slack — fire and forget
      sendBusinessEvent({
        event: 'nova_ocena',
        title: 'Nova ocena prejeta',
        details: {
          'Naloga ID': payload.taskId,
          'Obrtnik': partner.ime ?? 'Unknown',
          'Ocena': payload.rating ?? 0,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => console.error('[NotificationSubscriber] Slack review.submitted failed:', err))
    } catch (err) {
      console.error('[NotificationSubscriber] Error on review.submitted:', err)
    }
  })
}
