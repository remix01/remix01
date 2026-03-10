/**
 * Marketplace Liquidity Engine
 * 
 * Entry point for auto-matching, instant offers, and worker broadcast.
 * Triggered when a new service request arrives, orchestrates the entire
 * matching and notification pipeline without manual intervention.
 * 
 * Flow: onNewRequest → findMatches → tryInstantOffer → broadcast → setDeadline
 */

import { matchingService } from '@/lib/services'
import { taskOrchestrator } from '@/lib/services/taskOrchestrator'
import { workerBroadcast } from './workerBroadcast'
import { instantOffer } from './instantOffer'
import { supabaseAdmin } from '@/lib/supabase/server'

export const liquidityEngine = {
  /**
   * Entry point: triggered when new service request arrives
   * Auto-starts matching pipeline, finds partners, broadcasts to top 5
   */
  async onNewRequest(
    requestId: string,
    lat: number,
    lng: number,
    categoryId: string,
    userId: string
  ): Promise<void> {
    try {
      console.log('[LiquidityEngine] New request:', { requestId, lat, lng, categoryId })

      // 1. Find matching partners
      const matchResult = await matchingService.findMatches(
        requestId,
        lat,
        lng,
        categoryId,
        userId
      )

      if (!matchResult.matches || matchResult.matches.length === 0) {
        console.log('[LiquidityEngine] No matches found in primary radius')
        
        // Update task status to indicate no coverage
        await taskOrchestrator.updateTaskStatus(requestId, 'expired', {
          reason: 'no_coverage',
          searchRadius: '40km'
        })
        
        // TODO: Expand search radius or notify admin
        return
      }

      const topPartnerIds = matchResult.matches.map((m: any) => m.partnerId)
      console.log('[LiquidityEngine] Found partners:', topPartnerIds)

      // 2. Try instant offer for top partner (if enabled and has template)
      if (matchResult.matches[0]) {
        await this.tryInstantOffer(requestId, matchResult.matches[0].partnerId)
      }

      // 3. Broadcast to top 5 partners
      await workerBroadcast.notifyMatched(requestId, topPartnerIds)

      // 4. Update task status to 'matched'
      await taskOrchestrator.updateTaskStatus(requestId, 'matched', {
        matchCount: matchResult.matches.length,
        topPartnerId: matchResult.matches[0].partnerId,
        topScore: matchResult.matches[0].score,
      })

      // 5. Set 2-hour deadline timer (auto-expire if no response)
      const deadlineMs = 2 * 60 * 60 * 1000 // 2 hours
      setTimeout(
        () => this.onGuaranteeExpired(requestId),
        deadlineMs
      )

      console.log('[LiquidityEngine] Broadcast complete, 2h deadline set')
    } catch (error) {
      console.error('[LiquidityEngine] onNewRequest failed:', error)
      // Don't throw — let API respond with error instead
      // Task status should be updated by caller if needed
    }
  },

  /**
   * Check if partner has instant offer template enabled
   * If yes + PRO plan → auto-generate and send offer draft
   */
  async tryInstantOffer(requestId: string, partnerId: string): Promise<void> {
    try {
      // Check if partner has instant offers enabled
      const { data: partner } = await supabaseAdmin
        .from('obrtnik_profiles')
        .select('enable_instant_offers, instant_offer_templates, plan_type')
        .eq('id', partnerId)
        .single()

      if (!partner?.enable_instant_offers) {
        console.log('[LiquidityEngine] Partner has instant offers disabled')
        return
      }

      // Only PRO plan partners can use instant offers
      if (partner.plan_type !== 'PRO') {
        console.log('[LiquidityEngine] Partner not on PRO plan, skipping instant offer')
        return
      }

      // Generate and send draft offer
      await instantOffer.generateForPartner(requestId, partnerId)
      console.log('[LiquidityEngine] Instant offer generated for partner:', partnerId)
    } catch (error) {
      console.error('[LiquidityEngine] tryInstantOffer failed:', error)
      // Don't fail the whole flow — instant offer is optional
    }
  },

  /**
   * Triggered on 2-hour guarantee expiration
   * Either expand search radius or activate SLA guarantee payout
   */
  async onGuaranteeExpired(requestId: string): Promise<void> {
    try {
      console.log('[LiquidityEngine] 2h guarantee expired for request:', requestId)

      // Check if any offers were accepted
      const { data: accepted } = await supabaseAdmin
        .from('ponudbe')
        .select('id')
        .eq('povprasevanje_id', requestId)
        .eq('status', 'sprejeta')
        .limit(1)

      if (accepted && accepted.length > 0) {
        console.log('[LiquidityEngine] Offer already accepted, no action needed')
        return
      }

      // No accepted offers → task expires and guarantee activates
      await taskOrchestrator.updateTaskStatus(requestId, 'expired', {
        guaranteeExpired: true,
        activateSLA: true,
      })

      console.log('[LiquidityEngine] Task expired, SLA guarantee activated')
    } catch (error) {
      console.error('[LiquidityEngine] onGuaranteeExpired failed:', error)
    }
  },

  /**
   * Expand search radius when initial matching fails
   * Try 75km, then 150km, then notify admin
   */
  async expandSearchRadius(
    requestId: string,
    lat: number,
    lng: number,
    categoryId: string,
    userId: string,
    currentRadius: number = 40
  ): Promise<void> {
    const expandedRadius = currentRadius === 40 ? 75 : 150

    console.log(
      `[LiquidityEngine] Expanding search radius: ${currentRadius}km → ${expandedRadius}km`
    )

    // TODO: Implement extended radius matching
    // This would involve updating matching algorithm to accept radius parameter
    // and re-running with larger bounds

    if (expandedRadius > 150) {
      console.warn('[LiquidityEngine] Max search radius exceeded, notifying admin')
      // TODO: Trigger admin notification
    }
  },
}
