/**
 * Daily Review Reminders Cron
 *
 * Finds customers with tasks completed 24-48 hours ago that haven't
 * been reviewed yet, and sends them a review request email.
 *
 * Schedule: daily at 09:00 UTC (vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { automationDailyReviewReminders } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[daily-review-reminders] CRON_SECRET not configured — endpoint is public')
    return true
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const from = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const to = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Find tasks completed in the 24-48 hour window
    const { data: completedTasks, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, customer_id, assigned_to')
      .eq('status', 'completed')
      .gte('completed_at', from)
      .lte('completed_at', to)

    if (error) {
      console.error('[daily-review-reminders] DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!completedTasks || completedTasks.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Look up customer emails and provider names
    const customerIds = [...new Set(completedTasks.map((t) => t.customer_id).filter(Boolean))]
    const providerIds = [...new Set(completedTasks.map((t) => t.assigned_to).filter(Boolean))]

    const { data: customerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', customerIds as string[])

    const { data: providerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', providerIds as string[])

    const customerMap = new Map(customerProfiles?.map((p) => [p.id, p]) || [])
    const providerMap = new Map(providerProfiles?.map((p) => [p.id, p]) || [])

    const pendingReviews = completedTasks
      .map((task) => {
        const customer = customerMap.get(task.customer_id)
        const provider = providerMap.get(task.assigned_to)
        if (!customer?.email) return null
        return {
          email: customer.email,
          name: customer.full_name || 'Naročnik',
          jobTitle: task.title || 'Storitev',
          providerName: provider?.full_name || 'Mojster',
        }
      })
      .filter(Boolean) as Array<{
      email: string
      name: string
      jobTitle: string
      providerName: string
    }>

    if (pendingReviews.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const result = await automationDailyReviewReminders(pendingReviews, APP_URL)

    console.log('[daily-review-reminders] Sent:', pendingReviews.length, result)
    return NextResponse.json({ success: true, sent: pendingReviews.length })
  } catch (err) {
    console.error('[daily-review-reminders] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
