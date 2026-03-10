/**
 * AI Insights Subscriber — Analyzes events for insights + suggestions
 * 
 * AI role is ANALYSIS ONLY — not orchestration.
 * Processes completed events to generate insights and update quality scores.
 */

import { eventBus } from '../eventBus'
import { createAdminClient } from '@/lib/supabase/server'

export function registerAIInsightSubscriber() {
  eventBus.on('task.created', async (payload) => {
    try {
      // AI categorizes request and suggests optimal response time
      // Results stored in service_requests.ai_metadata (JSONB)
      console.log('[AIInsightSubscriber] Analyzing task:', payload.taskId)
      // TODO: Implement if AI categorization service exists
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on task.created:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      // AI generates completion summary for customer + partner
      // Stored in service_requests or separate table
      console.log('[AIInsightSubscriber] Generating summary for task:', payload.taskId)
      // TODO: Implement if summary generation service exists
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      // AI updates partner quality score based on project
      // Inputs: price adherence, completion time, review score (when available)
      const supabase = createAdminClient()

      console.log('[AIInsightSubscriber] Updating quality score for partner:', payload.partnerId)

      // TODO: Implement quality score calculation
      // const qualityScore = calculatePartnerQualityScore({
      //   priceAdherence: finalPrice / expectedPrice,
      //   completionTime: completedAt - acceptedAt,
      //   reviewScore: review?.score
      // })
      //
      // await supabase
      //   .from('obrtnik_profiles')
      //   .update({ quality_score: qualityScore })
      //   .eq('id', payload.partnerId)
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on payment.released:', err)
    }
  })
}
