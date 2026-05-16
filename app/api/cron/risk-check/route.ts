import { NextRequest, NextResponse } from 'next/server'
import { calculateJobRisk, getJobsForRiskCheck } from '@/lib/riskScoring/calculator'
import { adminAlertEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { env } from '@/lib/env'

export const maxDuration = 60

/**
 * Cron job: risk assessment for active povpraševanja.
 * Runs every 4 hours via Vercel Cron.
 * Authorization: CRON_SECRET in Bearer token.
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token || token !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[risk-check] Starting risk assessment for active jobs...')

  try {
    const jobs = await getJobsForRiskCheck()
    console.log(`[risk-check] Found ${jobs.length} jobs to check`)

    const results = { checked: 0, watch: 0, review: 0, critical: 0, errors: 0 }

    for (const job of jobs) {
      try {
        const risk = await calculateJobRisk(job.id)
        results.checked++

        if (risk.alertLevel === 'watch') {
          results.watch++
        } else if (risk.alertLevel === 'review') {
          results.review++
          await sendAdminAlert(job.id, risk.score, risk.flags, 'review')
        } else if (risk.alertLevel === 'critical') {
          results.critical++
          await handleCriticalRisk(job.id, risk.score, risk.flags)
        }

        console.log(`[risk-check] ${job.id}: score=${risk.score} level=${risk.alertLevel}`)
      } catch (error) {
        results.errors++
        console.error(`[risk-check] Error processing ${job.id}:`, error)
      }
    }

    console.log('[risk-check] Completed:', results)
    return NextResponse.json({ success: true, summary: results, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('[risk-check] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function sendAdminAlert(jobId: string, score: number, flags: string[], level: string) {
  const adminEmail = env.ADMIN_EMAIL || 'admin@liftgo.net'
  const emailTemplate = adminAlertEmail(jobId, score, flags)
  await sendEmail(adminEmail, emailTemplate)

  // severity CHECK constraint only allows 'warn' | 'critical'
  const severity = level === 'critical' ? 'critical' : 'warn'
  await supabaseAdmin.from('alert_log').insert({
    alert_type: 'risk_score',
    severity,
    message: `Povpraševanje ${jobId} risk score: ${score}`,
    metadata: { povprasevanje_id: jobId, score, flags, alertLevel: level },
    channels_notified: ['email'],
    resolved: false,
  })

  console.log(`[risk-check] Alert (${level}) sent for ${jobId}`)
}

async function handleCriticalRisk(jobId: string, score: number, flags: string[]) {
  // Log critical alert
  await sendAdminAlert(jobId, score, flags, 'critical')

  // Mark povpraševanje as cancelled (suspended) for admin review
  await supabaseAdmin
    .from('povprasevanja')
    .update({ status: 'cancelled' })
    .eq('id', jobId)

  console.log(`[risk-check] Povpraševanje ${jobId} suspended (critical risk score: ${score})`)
}
