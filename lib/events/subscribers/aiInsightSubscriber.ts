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

  eventBus.on('review.submitted', async (payload) => {
    try {
      // AI performs sentiment analysis on review comment
      // Flags negative reviews (rating <= 2) for admin follow-up
      // Updates partner trust score based on rating
      const supabase = createAdminClient()

      console.log(
        '[AIInsightSubscriber] Analyzing review for partner:',
        payload.partnerId,
        'rating:',
        payload.rating
      )

      // TODO: Implement sentiment analysis if service exists
      // const sentiment = await sentimentAnalysis(payload.comment)
      //
      // if (payload.rating <= 2) {
      //   await supabase.from('admin_alerts').insert({
      //     type: 'low_rating',
      //     taskId: payload.taskId,
      //     partnerId: payload.partnerId,
      //     rating: payload.rating,
      //     sentiment,
      //   })
      // }
      //
      // Update partner trust score
      // await supabase
      //   .from('obrtnik_profiles')
      //   .update({ trust_score: calculateTrustScore(payload.rating) })
      //   .eq('id', payload.partnerId)
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on review.submitted:', err)
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    try {
      // AI evaluates offer quality (price reasonableness, completeness)
      // Scores stored for analytics dashboard
      console.log('[AIInsightSubscriber] Evaluating offer quality:', payload.offerId)

      // TODO: Implement offer quality scoring if service exists
      // const score = evaluateOfferQuality({
      //   priceMin: payload.priceMin,
      //   priceMax: payload.priceMax,
      //   estimatedDays: payload.estimatedDays,
      // })
      //
      // await supabase.from('ponudbe').update({ quality_score: score }).eq('id', payload.offerId)
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on offer.sent:', err)
    }
  })
}
