/**
 * Cron Worker — Health Sweep
 * 
 * Runs every 2 minutes to check system health and trigger alerts.
 * Protected by CRON_SECRET.
 */

import { NextRequest } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/healthMonitor'
import { ok, fail } from '@/lib/http/response'

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized health sweep call')
    return fail('Unauthorized', 401)
  }

  const start = Date.now()
  console.log('[health-sweep] start', new Date().toISOString())

  try {
    await healthMonitor.runAll()

    const durationMs = Date.now() - start
    console.log(`[health-sweep] completed in ${durationMs}ms`)

    return ok({ ok: true, durationMs, ranAt: new Date().toISOString() })
  } catch (err) {
    const durationMs = Date.now() - start
    console.error(`[health-sweep] error after ${durationMs}ms:`, err)
    return fail('Internal server error', 500)
  }
}
