/**
 * GET /api/cron/metrics-push — Collects and remote-writes LiftGO business
 * metrics to Grafana Mimir (configured in vercel.json).
 *
 * Vercel Crons invoke routes with GET requests.
 */

import { NextResponse } from 'next/server'
import { collectBusinessMetrics, pushMetrics } from '@/lib/grafana'
import { withCronGuard } from '@/lib/cron/cronGuard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withCronGuard(
  { jobName: 'metrics-push', lockTtlSeconds: 90 },
  async (_req) => {
    const samples = await collectBusinessMetrics()
    await pushMetrics(samples)
    return NextResponse.json({ ok: true, pushed: samples.length })
  },
)
