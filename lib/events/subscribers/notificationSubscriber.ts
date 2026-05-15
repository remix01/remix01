/**
 * Notification Subscriber — Sends real-time + email notifications
 *
 * Pattern:
 * 1. Check idempotency — skip if already processed
 * 2. Fetch detailed data from DB (names, emails, task details)
 * 3. Send notifications via notificationService
 */

import { randomUUID } from 'crypto'
import { eventBus } from '../eventBus'
import { notificationService } from '@/lib/services'
import { idempotency } from '../idempotency'
import { createAdminClient } from '@/lib/supabase/server'
import { sendBusinessEvent } from '@/lib/slack'

function log(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown>) {
  console[level](JSON.stringify({ level, message, ...fields, at: new Date().toISOString() }))
}

export function registerNotificationSubscriber() {
  eventBus.on('task.matched', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('task.matched', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate task.matched', { correlationId, taskId: payload.taskId })
        return
      }

      const supabase = createAdminClient() as any
      const { data: partners } = await supabase
        .from('obrtnik_profiles')
        .select('id, ime, email, telefon')
        .in('id', payload.matchIds)

      if (!partners?.length) {
        log('warn', '[NotificationSubscriber] No partners found for task.matched', { correlationId, taskId: payload.taskId })
        return
      }

      await (notificationService as any).notifyPartnersMatched(
        payload.taskId,
        partners,
        payload.deadlineAt
      )

      log('info', '[NotificationSubscriber] task.matched notified', {
        correlationId,
        taskId: payload.taskId,
        partnerCount: partners.length,
      })

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
      }).catch((err) => log('error', '[NotificationSubscriber] Slack task.matched failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on task.matched', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  eventBus.on('task.accepted', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('task.accepted', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate task.accepted', { correlationId, taskId: payload.taskId })
        return
      }

      const supabase = createAdminClient() as any
      const [{ data: customerData }, { data: partner }] = await Promise.all([
        supabase.from('profiles').select('email, ime').eq('id', payload.customerId).single(),
        supabase.from('obrtnik_profiles').select('email, ime').eq('id', payload.partnerId).single(),
      ])
      const customer = customerData as { email: string | null; ime: string | null } | null

      if (!customer || !partner) {
        log('warn', '[NotificationSubscriber] Missing customer or partner for task.accepted', {
          correlationId,
          taskId: payload.taskId,
          hasCustomer: !!customer,
          hasPartner: !!partner,
        })
        return
      }

      await (notificationService as any).notifyAccepted(payload.taskId, customer, partner)

      log('info', '[NotificationSubscriber] task.accepted notified', { correlationId, taskId: payload.taskId })

      sendBusinessEvent({
        event: 'ponudba_sprejeta',
        title: 'Ponudba sprejeta',
        details: {
          'Naloga ID': payload.taskId,
          'Obrtnik': partner.ime ?? 'Unknown',
          'Naročnik': customer.ime ?? 'Unknown',
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => log('error', '[NotificationSubscriber] Slack task.accepted failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on task.accepted', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  eventBus.on('task.completed', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate task.completed', { correlationId, taskId: payload.taskId })
        return
      }

      await (notificationService as any).requestReview(payload.taskId, payload.customerId, payload.partnerId)

      log('info', '[NotificationSubscriber] task.completed review requested', { correlationId, taskId: payload.taskId })

      sendBusinessEvent({
        event: 'nova_ocena',
        title: 'Naloga dokončana — čakanje na oceno',
        details: { 'Naloga ID': payload.taskId },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => log('error', '[NotificationSubscriber] Slack task.completed failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on task.completed', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  eventBus.on('payment.released', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('payment.released', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate payment.released', { correlationId, taskId: payload.taskId })
        return
      }

      await (notificationService as any).notifyPaymentReleased(payload.partnerId, payload.netAmount, payload.taskId)

      log('info', '[NotificationSubscriber] payment.released notified', {
        correlationId,
        taskId: payload.taskId,
        partnerId: payload.partnerId,
        netAmount: payload.netAmount,
      })

      sendBusinessEvent({
        event: 'placilo_prejeto',
        title: 'Plačilo izvršeno',
        details: {
          'Naloga ID': payload.taskId,
          'Znesek': `€${(payload.netAmount / 100).toFixed(2)}`,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => log('error', '[NotificationSubscriber] Slack payment.released failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on payment.released', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('offer.sent', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate offer.sent', { correlationId, taskId: payload.taskId })
        return
      }

      await (notificationService as any).notifyOfferReceived(payload.taskId, payload.partnerId)

      log('info', '[NotificationSubscriber] offer.sent notified', { correlationId, taskId: payload.taskId })

      sendBusinessEvent({
        event: 'nova_ponudba',
        title: 'Nova ponudba za nalogo',
        details: { 'Naloga ID': payload.taskId },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => log('error', '[NotificationSubscriber] Slack offer.sent failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on offer.sent', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  eventBus.on('review.submitted', async (payload) => {
    const correlationId = randomUUID()
    try {
      const skip = await idempotency.checkAndMark('review.submitted', 'notify', payload.taskId)
      if (skip) {
        log('info', '[NotificationSubscriber] Skipped duplicate review.submitted', { correlationId, taskId: payload.taskId })
        return
      }

      const supabase = createAdminClient() as any
      const { data: partner } = await supabase
        .from('obrtnik_profiles')
        .select('email, ime')
        .eq('id', payload.partnerId)
        .single()

      if (!partner) {
        log('warn', '[NotificationSubscriber] Partner not found for review.submitted', {
          correlationId,
          taskId: payload.taskId,
          partnerId: payload.partnerId,
        })
        return
      }

      await (notificationService as any).notifyReviewSubmitted(payload.taskId, partner, payload.rating)

      log('info', '[NotificationSubscriber] review.submitted notified', {
        correlationId,
        taskId: payload.taskId,
        partnerId: payload.partnerId,
        rating: payload.rating,
      })

      sendBusinessEvent({
        event: 'nova_ocena',
        title: 'Nova ocena prejeta',
        details: {
          'Naloga ID': payload.taskId,
          'Obrtnik': partner.ime ?? 'Unknown',
          'Ocena': payload.rating ?? 0,
        },
        link: `https://liftgo.net/admin/narocila/${payload.taskId}`,
      }).catch((err) => log('error', '[NotificationSubscriber] Slack review.submitted failed', { correlationId, error: String(err) }))
    } catch (err) {
      log('error', '[NotificationSubscriber] Error on review.submitted', {
        correlationId,
        taskId: payload.taskId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
