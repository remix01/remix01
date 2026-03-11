/**
 * Cron Worker — Health Sweep
 * 
 * Runs every 2 minutes to check system health and trigger alerts.
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/healthMonitor'

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized health sweep call')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    await healthMonitor.runAll()

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - start,
      ranAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Health sweep error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
