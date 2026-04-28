/**
 * Daily Review Reminders Cron Job
 *
 * Runs daily at 09:00 UTC. Finds completed tasks where:
 * - completed_at is between 24h and 48h ago (first and only reminder window)
 * - customer has not yet left a review (no email_log entry of type 'review_request' for this task)
 *
 * Sends a review request email to each customer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { automationDailyReviewReminders } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[daily-review-reminders] start', ranAt: new Date().toISOString() }))

  try {
    const now = new Date()
    const window48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const window24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Find tasks completed in the 24-48h window
    const { data: completedTasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, customer_id, assigned_to')
      .eq('status', 'completed')
      .gte('completed_at', window48h)
      .lt('completed_at', window24h)
      .not('customer_id', 'is', null)
      .not('assigned_to', 'is', null)
      .limit(100)

    if (tasksError) {
      console.error('[daily-review-reminders] tasks query error:', tasksError.message)
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    if (!completedTasks?.length) {
      console.log('[daily-review-reminders] no eligible tasks')
      return NextResponse.json({ success: true, sent: 0, message: 'No pending reviews' })
    }

    // Filter out tasks where we already sent a review_request email
    const taskIds = completedTasks.map((t) => t.id)
    const { data: alreadySent } = await supabaseAdmin
      .from('email_logs')
      .select('metadata')
      .eq('type', 'review_request')
      .eq('status', 'sent')
      .in('metadata->>task_id', taskIds)

    const alreadySentTaskIds = new Set(
      (alreadySent || []).map((row: any) => row.metadata?.task_id).filter(Boolean)
    )

    const pending = completedTasks.filter((t) => !alreadySentTaskIds.has(t.id))

    if (!pending.length) {
      console.log('[daily-review-reminders] all tasks already notified')
      return NextResponse.json({ success: true, sent: 0, message: 'All already notified' })
    }

    // Fetch customer profiles and obrtnik names in parallel
    const customerIds = [...new Set(pending.map((t) => t.customer_id))]
    const obrtniktIds = [...new Set(pending.map((t) => t.assigned_to))]

    const [{ data: customers }, { data: obrtniki }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', customerIds),
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('id, ime')
        .in('id', obrtniktIds),
    ])

    const customerMap = new Map((customers || []).map((c: any) => [c.id, c]))
    const obrtnikiMap = new Map((obrtniki || []).map((o: any) => [o.id, o]))

    const pendingReviews = pending
      .map((task) => {
        const customer = customerMap.get(task.customer_id)
        const obrtnik = obrtnikiMap.get(task.assigned_to)
        if (!customer?.email) return null
        return {
          email: customer.email,
          name: customer.full_name || 'Naročnik',
          jobTitle: task.title || 'Storitev',
          providerName: obrtnik?.ime || 'Mojster',
          taskId: task.id,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (!pendingReviews.length) {
      return NextResponse.json({ success: true, sent: 0, message: 'No valid recipients' })
    }

    const result = await automationDailyReviewReminders(
      pendingReviews.map(({ email, name, jobTitle, providerName }) => ({
        email,
        name,
        jobTitle,
        providerName,
      })),
      APP_URL
    )

    // Log each sent review request to avoid duplicate sends next run
    if (result.success) {
      await Promise.allSettled(
        pendingReviews.map((r) =>
          supabaseAdmin.from('email_logs').insert({
            email: r.email,
            type: 'review_request',
            status: 'sent',
            metadata: { task_id: r.taskId },
          })
        )
      )
    }

    const elapsed = Date.now() - start
    console.log(JSON.stringify({ level: 'info', message: '[daily-review-reminders] done', sent: pendingReviews.length, elapsed }))

    return NextResponse.json({
      success: result.success,
      sent: pendingReviews.length,
      elapsed,
    })
  } catch (error) {
    console.error('[daily-review-reminders] error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
