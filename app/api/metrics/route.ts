/**
 * GET /api/metrics — Prometheus scrape endpoint for Grafana
 *
 * Secured with Bearer token (METRICS_SCRAPE_TOKEN env var).
 * Add this URL to your Grafana Cloud Hosted Prometheus scrape config:
 *   - url: https://liftgo.net/api/metrics
 *     basic_auth / bearer_token: <METRICS_SCRAPE_TOKEN>
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectBusinessMetrics, renderPrometheusText } from '@/lib/grafana'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = process.env.METRICS_SCRAPE_TOKEN
  if (token) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${token}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  try {
    const samples = await collectBusinessMetrics()
    const body = renderPrometheusText(samples)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err) {
    console.error('[/api/metrics]', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
