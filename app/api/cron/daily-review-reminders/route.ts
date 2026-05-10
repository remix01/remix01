import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { automationDailyReviewReminders } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Get tasks completed in the last 24-48 hours with NO review yet
    const from = new Date()
    from.setDate(from.getDate() - 2)
    const to = new Date()
    to.setDate(to.getDate() - 1)

    // Query completed tasks that don't have a review
    const { data: tasksWithoutReview, error: queryError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        customer_id,
        assigned_to,
        completed_at,
        profiles!tasks_assigned_to_fkey(name, email),
        profiles!tasks_customer_id_fkey(name, email)
      `)
      .eq('status', 'completed')
      .gte('completed_at', from.toISOString())
      .lte('completed_at', to.toISOString())
      .is('review_id', null)

    if (queryError) {
      console.error('[daily-review-reminders] Query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    const pendingReviews = (tasksWithoutReview || []).map((task: any) => ({
      email: task.profiles?.[1]?.email || '',
      name: task.profiles?.[1]?.name || 'Customer',
      jobTitle: task.title,
      providerName: task.profiles?.[0]?.name || 'Service Provider',
    })).filter((review: any) => review.email)

    if (pendingReviews.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const result = await automationDailyReviewReminders(pendingReviews, APP_URL)

    return NextResponse.json({ success: result.success, sent: pendingReviews.length, result })
  } catch (err) {
    console.error('[daily-review-reminders] Error:', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }
}
