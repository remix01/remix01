/**
 * GET /api/cron/metrics-push — Collects and remote-writes LiftGO business
 * metrics to Grafana Mimir every 60 seconds (configured in vercel.json).
 *
 * Vercel Crons invoke routes with GET requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectBusinessMetrics, pushMetrics } from '@/lib/grafana'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const samples = await collectBusinessMetrics()
    await pushMetrics(samples)
    return NextResponse.json({ ok: true, pushed: samples.length })
  } catch (err) {
    console.error('[cron/metrics-push]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
