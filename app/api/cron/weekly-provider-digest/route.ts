import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { automationWeeklyProviderDigest } from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Get active providers
    const { data: providers, error: providerError } = await supabase
      .from('obrtnik_profiles')
      .select('id, email, ime')
      .eq('verified', true)
      .eq('aktiven', true)
      .limit(500)

    if (providerError) {
      console.error('[weekly-provider-digest] Provider query error:', providerError)
      return NextResponse.json({ error: providerError.message }, { status: 500 })
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Calculate week boundaries
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Get provider stats for the week
    const providerStats = await Promise.all(
      providers.map(async (provider: any) => {
        // Count new requests
        const { count: newRequests } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('assigned_to', provider.id)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString())

        // Count pending jobs
        const { count: pendingJobs } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('assigned_to', provider.id)
          .eq('status', 'in_progress')

        // Calculate total earnings
        const { data: earnings } = await supabase
          .from('tasks')
          .select('amount')
          .eq('assigned_to', provider.id)
          .eq('status', 'completed')
          .gte('completed_at', weekStart.toISOString())
          .lt('completed_at', weekEnd.toISOString())

        const totalEarnings = (earnings || []).reduce((sum: number, task: any) => sum + (task.amount || 0), 0)

        return {
          email: provider.email,
          name: provider.ime,
          newRequests: newRequests || 0,
          pendingJobs: pendingJobs || 0,
          totalEarnings,
        }
      })
    )

    // Filter out providers with no activity
    const activeProviders = providerStats.filter(
      (p: any) => p.newRequests > 0 || p.pendingJobs > 0 || p.totalEarnings > 0
    )

    if (activeProviders.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Chunk digests into batches of 100 to respect sendBatchEmails limit
    const BATCH_SIZE = 100
    if (activeProviders.length > BATCH_SIZE) {
      const chunks = []
      for (let i = 0; i < activeProviders.length; i += BATCH_SIZE) {
        chunks.push(activeProviders.slice(i, i + BATCH_SIZE))
      }

      let totalSent = 0
      let allSuccess = true
      for (const chunk of chunks) {
        const result = await automationWeeklyProviderDigest(chunk, APP_URL)
        if (result.success) {
          totalSent += chunk.length
        } else {
          allSuccess = false
          console.error('[weekly-provider-digest] Chunk send failed:', result.error)
        }
      }

      return NextResponse.json({
        success: allSuccess,
        sent: totalSent,
        chunks: chunks.length,
        message: allSuccess ? 'All chunks sent successfully' : 'Some chunks failed to send'
      })
    }

    const result = await automationWeeklyProviderDigest(activeProviders, APP_URL)

    return NextResponse.json({ success: result.success, sent: activeProviders.length, result })
  } catch (err) {
    console.error('[weekly-provider-digest] Error:', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }
}
