/**
 * Marketplace Liquidity Engine
 *
 * Entry point for matching + lead distribution.
 * Flow: onNewRequest → matchPartnersForRequest → createLeadAssignments
 *       → notifyFirst → (cron escalates if no response)
 *
 * Lead escalation model:
 *   Rank 1 contractor notified immediately, has LEAD_SLA_HOURS to respond.
 *   If no response → cron marks expired, activates rank 2, notifies them.
 *   Repeats until someone responds or all ranks exhausted.
 */

import { matchPartnersForRequest, LEAD_SLA_HOURS, MAX_MATCHES, type MatchResult } from '@/lib/agents/matching/smartMatchingAgent'
import { taskOrchestrator } from '@/lib/services/taskOrchestrator'
import { workerBroadcast } from './workerBroadcast'
import { instantOffer } from './instantOffer'
import { createAdminClient } from '@/lib/supabase/server'

export const liquidityEngine = {
  /**
   * Called when a new povprasevanje is created.
   * Runs matching, creates lead_assignments, notifies rank-1 contractor.
   */
  async onNewRequest(
    requestId: string,
    lat: number,
    lng: number,
    categoryId: string,
    userId: string
  ): Promise<void> {
    try {
      console.log(JSON.stringify({
        level: 'info',
        event: 'liquidity_engine_start',
        requestId, categoryId,
      }))

      // 1. Find matching partners
      const matchResult = await matchPartnersForRequest({ requestId, lat, lng, categoryId })

      if (!matchResult.matches || matchResult.matches.length === 0) {
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'no_matches_found',
          requestId,
          error: matchResult.error,
        }))

        await taskOrchestrator.updateTaskStatus(requestId, 'expired', {
          reason: 'no_coverage',
          searchRadiusKm: 75,
        })
        return
      }

      // 2. Persist lead_assignments for all matches (rank 1 = active, rest = skipped until escalated)
      await this.createLeadAssignments(requestId, matchResult.matches)

      // 3. Try instant offer for rank-1 (PRO+ only)
      const rank1 = matchResult.matches[0]
      await this.tryInstantOffer(requestId, rank1.partnerId)

      // 4. Notify rank-1 only (escalation handled by cron)
      await workerBroadcast.notifyMatched(requestId, [rank1.partnerId])

      // 5. Update task status to 'matched'
      await taskOrchestrator.updateTaskStatus(requestId, 'matched', {
        matchCount: matchResult.matches.length,
        topPartnerId: rank1.partnerId,
        topScore: rank1.score,
      })

      console.log(JSON.stringify({
        level: 'info',
        event: 'liquidity_engine_done',
        requestId,
        rank1PartnerId: rank1.partnerId,
        rank1Score: rank1.score,
        totalMatches: matchResult.matches.length,
      }))
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'liquidity_engine_error',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  },

  /**
   * Write lead_assignments rows for all matched partners.
   * Rank 1 → status='pending' (SLA clock starts now).
   * Ranks 2–N → status='skipped' (activated by cron if rank-1 doesn't respond).
   * Also increments active_lead_count for rank-1 only.
   */
  async createLeadAssignments(requestId: string, matches: MatchResult[]): Promise<void> {
    const supabase = createAdminClient()
    const expiresAt = new Date(Date.now() + LEAD_SLA_HOURS * 60 * 60 * 1000).toISOString()

    const rows = (matches as any[]).map((m: any, i: number) => ({
      povprasevanje_id: requestId,
      obrtnik_id: m.partnerId,
      rank: m.rank,
      score: m.score,
      status: i === 0 ? 'pending' : 'skipped',
      expires_at: i === 0 ? expiresAt : new Date(Date.now() + (LEAD_SLA_HOURS * (i + 1)) * 60 * 60 * 1000).toISOString(),
    }))

    const { error } = await supabase.from('lead_assignments' as any).insert(rows)
    if (error) {
      console.error('[LiquidityEngine] Failed to insert lead_assignments:', error.message)
      return
    }

    // Increment active_lead_count for rank-1 contractor
    if (rows.length > 0) {
      await (supabase as any).rpc('increment_active_leads', {
        p_obrtnik_id: (matches as any[])[0].partnerId,
      })
    }
  },

  /**
   * Check if partner has instant offer template + PRO plan → auto-draft offer.
   */
  async tryInstantOffer(requestId: string, partnerId: string): Promise<void> {
    try {
      const supabase = createAdminClient()
      const { data: partner } = await supabase
        .from('obrtnik_profiles')
        .select('enable_instant_offers, instant_offer_templates, plan_type')
        .eq('id', partnerId)
        .single() as any

      if (!(partner as any)?.enable_instant_offers) return
      if ((partner as any)?.plan_type !== 'PRO') return

      await instantOffer.generateForPartner(requestId, partnerId)
    } catch (error) {
      // Instant offer is optional — don't fail the pipeline
      console.warn('[LiquidityEngine] tryInstantOffer failed (non-fatal):', String(error))
    }
  },

  /**
   * Called by the lead-response-sla cron when a pending assignment expires.
   * Notifies the next ranked contractor.
   */
  async escalateLead(expiredAssignmentId: string): Promise<void> {
    try {
      const supabase = createAdminClient()

      // DB function marks old as expired + activates next rank
      const { data } = await (supabase as any).rpc('expire_lead_assignment', {
        p_assignment_id: expiredAssignmentId,
      })

      const next = Array.isArray(data) ? data[0] : data
      if (!next?.next_obrtnik_id) {
        console.log(JSON.stringify({
          level: 'info',
          event: 'escalation_exhausted',
          expiredAssignmentId,
        }))
        return
      }

      // Get povprasevanje_id for notification
      const { data: assignment } = await (supabase as any)
        .from('lead_assignments')
        .select('povprasevanje_id')
        .eq('obrtnik_id', next.next_obrtnik_id)
        .eq('status', 'pending')
        .single()

      if (!assignment?.povprasevanje_id) return

      await workerBroadcast.notifyMatched(assignment.povprasevanje_id, [next.next_obrtnik_id])

      console.log(JSON.stringify({
        level: 'info',
        event: 'lead_escalated',
        expiredAssignmentId,
        nextObrtnikId: next.next_obrtnik_id,
        nextRank: next.next_rank,
      }))
    } catch (error) {
      console.error('[LiquidityEngine] escalateLead error:', String(error))
    }
  },

  /**
   * Expand search radius when initial matching fails (future: re-run with larger bounds).
   */
  async expandSearchRadius(
    requestId: string,
    lat: number,
    lng: number,
    categoryId: string,
    userId: string,
    currentRadius: number = 40
  ): Promise<void> {
    const expandedRadius = currentRadius < 75 ? 75 : 150
    console.warn(`[LiquidityEngine] Expanding radius: ${currentRadius}km → ${expandedRadius}km for ${requestId}`)
    if (expandedRadius > 150) {
      console.warn('[LiquidityEngine] Max radius exceeded — admin notification needed')
    }
  },
}
