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
        provider:profiles!tasks_assigned_to_fkey(name, email),
        customer:profiles!tasks_customer_id_fkey(name, email)
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
      email: task.customer?.email || '',
      name: task.customer?.name || 'Customer',
      jobTitle: task.title,
      providerName: task.provider?.name || 'Service Provider',
    })).filter((review: any) => review.email)

    // Chunk reminders into batches of 100 to respect sendBatchEmails limit
    const BATCH_SIZE = 100
    if (pendingReviews.length > BATCH_SIZE) {
      const chunks: (typeof pendingReviews)[] = []
      for (let i = 0; i < pendingReviews.length; i += BATCH_SIZE) {
        chunks.push(pendingReviews.slice(i, i + BATCH_SIZE))
      }

      let totalSent = 0
      let allSuccess = true
      for (const chunk of chunks) {
        const result = await automationDailyReviewReminders(chunk, APP_URL)
        if (result.success) {
          totalSent += chunk.length
        } else {
          allSuccess = false
          const errorMsg = ('error' in result) ? result.error : 'Unknown error'
          console.error('[daily-review-reminders] Chunk send failed:', errorMsg)
        }
      }

      return NextResponse.json({
        success: allSuccess,
        sent: totalSent,
        chunks: chunks.length,
        message: allSuccess ? 'All chunks sent successfully' : 'Some chunks failed to send'
      })
    }

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
