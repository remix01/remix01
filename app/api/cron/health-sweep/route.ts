/**
 * Cron Worker — Health Sweep
 *
 * Checks system health and triggers alerts.
 * Protected by CRON_SECRET + overlap lock via withCronGuard.
 */

import { NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/healthMonitor'
import { withCronGuard } from '@/lib/cron/cronGuard'

export const GET = withCronGuard(
  { jobName: 'health-sweep', lockTtlSeconds: 90 },
  async (_req) => {
    const start = Date.now()
    await healthMonitor.runAll()
    return NextResponse.json({ ok: true, durationMs: Date.now() - start, ranAt: new Date().toISOString() })
  },
)
