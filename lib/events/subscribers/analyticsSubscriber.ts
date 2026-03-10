/**
 * Analytics Subscriber — Tracks marketplace metrics
 * 
 * Records all major events to analytics_events table for reporting,
 * dashboards, and funnel analysis (created → matched → accepted → completed).
 * 
 * Idempotency prevents duplicate analytics records.
 */

import { eventBus } from '../eventBus'
import { idempotency } from '../idempotency'
import { createAdminClient } from '@/lib/supabase/server'

export function registerAnalyticsSubscriber() {
  eventBus.on('task.created', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.created', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'task_created',
        task_id: payload.taskId,
        category_id: payload.categoryId,
        region_lat: payload.lat,
        region_lng: payload.lng,
        occurred_at: payload.createdAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording task.created:', err)
    }
  })

  eventBus.on('task.matched', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.matched', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'task_matched',
        task_id: payload.taskId,
        top_score: payload.topScore,
        occurred_at: payload.matchedAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording task.matched:', err)
    }
  })

  eventBus.on('task.accepted', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.accepted', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'task_accepted',
        task_id: payload.taskId,
        partner_id: payload.partnerId,
        price: payload.agreedPrice,
        occurred_at: payload.acceptedAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording task.accepted:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'task_completed',
        task_id: payload.taskId,
        partner_id: payload.partnerId,
        final_price: payload.finalPrice,
        occurred_at: payload.completedAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('payment.released', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'payment_released',
        task_id: payload.taskId,
        partner_id: payload.partnerId,
        gross: payload.amount,
        commission: payload.commission,
        net: payload.netAmount,
        occurred_at: payload.releasedAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording payment.released:', err)
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('offer.sent', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'offer_sent',
        task_id: payload.taskId,
        partner_id: payload.partnerId,
        price_min: payload.priceMin,
        price_max: payload.priceMax,
        occurred_at: payload.sentAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording offer.sent:', err)
    }
  })

  eventBus.on('review.submitted', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('review.submitted', 'analytics', payload.taskId)
      if (skip) return

      const supabase = createAdminClient()
      await supabase.from('analytics_events').insert({
        event: 'review_submitted',
        task_id: payload.taskId,
        partner_id: payload.partnerId,
        rating: payload.rating,
        occurred_at: payload.submittedAt,
      })
    } catch (err) {
      console.error('[AnalyticsSubscriber] Error recording review.submitted:', err)
    }
  })
}
