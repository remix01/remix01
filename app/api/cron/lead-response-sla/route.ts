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
import { createAdminClient } from '@/lib/supabase/server'

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

    // Find all expired pending assignments
    const { data: expired, error } = await (supabase as any)
      .from('lead_assignments')
      .select('id, povprasevanje_id, obrtnik_id, rank, score')
      .eq('status', 'pending')
      .lt('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[LeadSLA] Query error:', error.message)
      return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired lead assignments',
        processed: 0,
        durationMs: Date.now() - startTime,
      })
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'lead_sla_cron_start',
      expiredCount: expired.length,
    }))

    const escalated: string[] = []
    const exhausted: string[] = []
    const failed: string[] = []

    for (const assignment of expired) {
      try {
        // expire_lead_assignment returns next obrtnik if one exists
        const { data: nextData } = await (supabase as any).rpc('expire_lead_assignment', {
          p_assignment_id: assignment.id,
        })

        const next = Array.isArray(nextData) ? nextData[0] : nextData

        if (next?.next_obrtnik_id) {
          // Notify the next contractor
          await liquidityEngine.escalateLead(assignment.id)
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
          // All ranks exhausted — log for admin
          exhausted.push(assignment.id)

          console.warn(JSON.stringify({
            level: 'warn',
            event: 'lead_all_ranks_exhausted',
            assignmentId: assignment.id,
            povprasenjeId: assignment.povprasevanje_id,
          }))

          // Create admin alert notification
          await (supabase as any).from('notifications').insert({
            user_id: null, // admin channel (type-specific)
            type: 'lead_unassigned',
            title: 'Lead brez odgovora — ni več obrtnikov',
            message: `Povpraševanje ${assignment.povprasevanje_id} ni dobilo odgovora pri nobenem obrtniku.`,
            link: `/admin/povprasevanja/${assignment.povprasevanje_id}`,
            metadata: {
              povprasevanje_id: assignment.povprasevanje_id,
              last_assignment_id: assignment.id,
            },
          })
        }
      } catch (err) {
        console.error('[LeadSLA] Escalation error for', assignment.id, ':', String(err))
        failed.push(assignment.id)
      }
    }

    const summary = {
      success: true,
      processed: expired.length,
      escalated: escalated.length,
      exhausted: exhausted.length,
      failed: failed.length,
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
