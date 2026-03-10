/**
 * Analytics Subscriber — Tracks marketplace metrics
 * 
 * Records all major events to analytics_events table for reporting,
 * dashboards, and funnel analysis (created → matched → accepted → completed).
 */

import { eventBus } from '../eventBus'
import { createAdminClient } from '@/lib/supabase/server'

export function registerAnalyticsSubscriber() {
  eventBus.on('task.created', async (payload) => {
    try {
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
}
