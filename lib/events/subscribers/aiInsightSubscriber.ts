/**
 * AI Insights Subscriber — Analyzes events for insights + suggestions
 * 
 * AI role is ANALYSIS ONLY — not orchestration.
 * Processes completed events to generate insights and update quality scores.
 * 
 * Idempotency prevents duplicate AI analysis.
 */

import { eventBus } from '../eventBus'
import { idempotency } from '../idempotency'
import { createAdminClient } from '@/lib/supabase/server'
import { fireAndForgetAI } from '@/lib/ai/ai-guard'

export function registerAIInsightSubscriber() {
  eventBus.on('task.created', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.created', 'ai_insight', payload.taskId)
      if (skip) return

      fireAndForgetAI(`aiInsight.task.created.${payload.taskId}`, async () => {
        console.log('[AIInsightSubscriber] Analyzing task:', payload.taskId)
        // TODO: Implement AI categorization service
      })
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on task.created:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'ai_insight', payload.taskId)
      if (skip) return

      fireAndForgetAI(`aiInsight.task.completed.${payload.taskId}`, async () => {
        console.log('[AIInsightSubscriber] Generating summary for task:', payload.taskId)
        // TODO: Implement summary generation service
      })
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on task.completed:', err)
    }
  })

  eventBus.on('payment.released', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('payment.released', 'ai_insight', payload.taskId)
      if (skip) return

      const supabase = createAdminClient() as any
      console.log('[AIInsightSubscriber] Updating quality score for partner:', payload.partnerId)

      // TODO: Implement quality score calculation
      // const qualityScore = calculatePartnerQualityScore({...})
      // await supabase.from('obrtnik_profiles').update({...}).eq('id', payload.partnerId)
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on payment.released:', err)
    }
  })

  eventBus.on('review.submitted', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('review.submitted', 'ai_insight', payload.taskId)
      if (skip) return

      const supabase = createAdminClient() as any
      console.log(
        '[AIInsightSubscriber] Analyzing review for partner:',
        payload.partnerId,
        'rating:',
        payload.rating
      )

      if (payload.rating <= 2) {
        await supabase.from('admin_alerts').insert({
          type: 'low_rating',
          severity: 'warning',
          title: 'Nizka ocena partnerja',
          message: `Partner ${payload.partnerId} je prejel oceno ${payload.rating}/5 za nalogo ${payload.taskId}.`,
          metadata: {
            partnerId: payload.partnerId,
            customerId: payload.customerId,
            taskId: payload.taskId,
            reviewId: payload.reviewId,
            rating: payload.rating,
            submittedAt: payload.submittedAt,
          },
          status: 'open',
        })
        console.log('[AIInsightSubscriber] Low-rating admin alert created for partner:', payload.partnerId)
      }

      const { data: stats } = await supabase
        .from('obrtnik_reviews')
        .select('rating')
        .eq('obrtnik_id', payload.partnerId)

      if (stats && stats.length > 0) {
        const totalReviews = stats.length
        const avgRating = stats.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews

        await supabase
          .from('obrtnik_profiles')
          .update({
            avg_rating: Math.round(avgRating * 100) / 100,
            total_reviews: totalReviews,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.partnerId)

        console.log('[AIInsightSubscriber] Updated partner trust score:', { partnerId: payload.partnerId, avgRating, totalReviews })
      }
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on review.submitted:', err)
    }
  })

  eventBus.on('offer.sent', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('offer.sent', 'ai_insight', payload.taskId)
      if (skip) return

      console.log('[AIInsightSubscriber] Evaluating offer quality:', payload.offerId)

      // TODO: Implement offer quality scoring if service exists
      // const score = evaluateOfferQuality({...})
      // await supabase.from('ponudbe').update({...}).eq('id', payload.offerId)
    } catch (err) {
      console.error('[AIInsightSubscriber] Error on offer.sent:', err)
    }
  })
}
