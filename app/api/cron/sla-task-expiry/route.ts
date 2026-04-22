import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('[v0] CRON_SECRET not configured - cron endpoint is public')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronSecret(req)) {
      console.error('[v0] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] SLA task expiry cron job started')

    // expire_tasks() bulk-updates all tasks where sla_expires_at < now()
    // and returns the number of tasks expired.
    const { data: expiredCount, error } = await supabaseAdmin.rpc('expire_tasks')

    if (error) {
      console.error('[v0] SLA task expiry cron job failed:', error)
      return NextResponse.json(
        { success: false, error: 'Cron job failed', message: error.message },
        { status: 500 }
      )
    }

    const summary = {
      success: true,
      expiredCount: expiredCount ?? 0,
      message: `Expired ${expiredCount ?? 0} overdue tasks`,
    }

    console.log('[v0] SLA task expiry cron job completed:', summary)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[v0] SLA task expiry cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
