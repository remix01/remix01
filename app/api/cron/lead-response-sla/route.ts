/**
 * Lead Response SLA Cron
 *
 * Runs every 15 minutes. Finds lead_assignments that:
 *   - status = 'pending'
 *   - expires_at < now()
 *
 * For each expired assignment:
 *   1. Calls expire_lead_assignment() which marks it expired + activates next rank
 *   2. Notifies the next ranked contractor via workerBroadcast
 *   3. If no next contractor → task remains open (manual admin review)
 *
 * Vercel cron schedule: every 15 minutes (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { liquidityEngine } from '@/lib/marketplace/liquidityEngine'
import { workerBroadcast } from '@/lib/marketplace/workerBroadcast'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'
import { sendNotification } from '@/lib/notifications'

const DEADLINE_WARNING_MINUTES = 30

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production'
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = createAdminClient()

  try {
    const now = new Date().toISOString()
    const warningThreshold = new Date(Date.now() + DEADLINE_WARNING_MINUTES * 60 * 1000).toISOString()

    // 1. Find all expired pending assignments
    const { data: expired, error } = await (supabase as any)
      .from('lead_assignments')
      .select('id, povprasevanje_id, obrtnik_id, rank, score')
      .eq('status', 'pending')
      .lt('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(50)

    // 2. Find assignments expiring within DEADLINE_WARNING_MINUTES (for warning notifications)
    const { data: expiringSoon } = await (supabase as any)
      .from('lead_assignments')
      .select('id, povprasevanje_id, obrtnik_id, expires_at, notified_deadline_warning')
      .eq('status', 'pending')
      .gt('expires_at', now)
      .lt('expires_at', warningThreshold)
      .neq('notified_deadline_warning', true)
      .limit(50)

    if (error) {
      console.error('[LeadSLA] Query error:', error.message)
      return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
    }

    const hasExpired = expired && expired.length > 0
    const hasWarnings = expiringSoon && expiringSoon.length > 0

    if (!hasExpired && !hasWarnings) {
      return NextResponse.json({
        success: true,
        message: 'No expired or expiring lead assignments',
        processed: 0,
        warnings: 0,
        durationMs: Date.now() - startTime,
      })
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'lead_sla_cron_start',
      expiredCount: expired?.length ?? 0,
      warningSoonCount: expiringSoon?.length ?? 0,
    }))

    // 3. Send deadline warnings (push + email, ignores quiet hours)
    let warningsSent = 0
    for (const assignment of expiringSoon || []) {
      try {
        const minutesLeft = Math.max(1, Math.round(
          (new Date(assignment.expires_at).getTime() - Date.now()) / (60 * 1000)
        ))

        await workerBroadcast.notifyDeadlineWarning(
          assignment.povprasevanje_id,
          [assignment.obrtnik_id],
          minutesLeft
        )

        await (supabase as any)
          .from('lead_assignments')
          .update({ notified_deadline_warning: true })
          .eq('id', assignment.id)

        warningsSent++
      } catch (err) {
        console.error('[LeadSLA] Warning notification error for', assignment.id, ':', String(err))
      }
    }

    // 4. Process expired assignments
    const escalated: string[] = []
    const exhausted: string[] = []
    const failed: string[] = []

    for (const assignment of expired || []) {
      try {
        const { data: nextData } = await (supabase as any).rpc('expire_lead_assignment', {
          p_assignment_id: assignment.id,
        })

        const next = Array.isArray(nextData) ? nextData[0] : nextData

        if (next?.next_obrtnik_id) {
          await liquidityEngine.escalateLead(assignment.id)

          await sendNotification({
            userId: next.next_obrtnik_id,
            type: 'lead_escalation',
            title: 'Nov lead na voljo — večja možnost za posel!',
            message: 'Ta lead je na voljo, ker prejšnji obrtnik ni odgovoril. Hitro oddajte ponudbo!',
            link: '/obrtnik/povprasevanja',
            metadata: {
              povprasevanje_id: assignment.povprasevanje_id,
              escalated_from_rank: assignment.rank,
            },
          })

          escalated.push(assignment.id)

          console.log(JSON.stringify({
            level: 'info',
            event: 'lead_escalated',
            assignmentId: assignment.id,
            povprasenjeId: assignment.povprasevanje_id,
            fromObrtnikId: assignment.obrtnik_id,
            toObrtnikId: next.next_obrtnik_id,
            toRank: next.next_rank,
          }))
        } else {
          exhausted.push(assignment.id)

          console.warn(JSON.stringify({
            level: 'warn',
            event: 'lead_all_ranks_exhausted',
            assignmentId: assignment.id,
            povprasenjeId: assignment.povprasevanje_id,
          }))

          await canonicalWriteGateway.appendNotification({
            user_id: null,
            type: 'lead_unassigned',
            title: 'Lead brez odgovora — ni več obrtnikov',
            message: `Povpraševanje ${assignment.povprasevanje_id} ni dobilo odgovora pri nobenem obrtniku.`,
            link: `/admin/povprasevanja/${assignment.povprasevanje_id}`,
            metadata: {
              povprasevanje_id: assignment.povprasevanje_id,
              last_assignment_id: assignment.id,
            },
          }, 'api.cron.lead-response-sla')
        }
      } catch (err) {
        console.error('[LeadSLA] Escalation error for', assignment.id, ':', String(err))
        failed.push(assignment.id)
      }
    }

    const summary = {
      success: true,
      processed: expired?.length ?? 0,
      escalated: escalated.length,
      exhausted: exhausted.length,
      failed: failed.length,
      warningsSent,
      durationMs: Date.now() - startTime,
    }

    console.log(JSON.stringify({ level: 'info', event: 'lead_sla_cron_done', ...summary }))

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[LeadSLA] Cron failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
