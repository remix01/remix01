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
  console.log(JSON.stringify({ level: 'info', message: '[health-sweep] start', ranAt: new Date().toISOString() }))

  try {
    await healthMonitor.runAll()

    const durationMs = Date.now() - start
    console.log(JSON.stringify({ level: 'info', message: '[health-sweep] completed', durationMs }))

    return NextResponse.json({ ok: true, durationMs, ranAt: new Date().toISOString() })
  } catch (err) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({ level: 'error', message: '[health-sweep] error', error: String(err), durationMs }))
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
