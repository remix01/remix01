import { NextResponse } from 'next/server'
import { getReadinessReport } from '@/lib/env'

export async function GET() {
  const report = getReadinessReport()
  const status = report.readiness.ok ? 200 : 503

  return NextResponse.json(
    {
      ok: report.readiness.ok,
      service: 'liftgo-web',
      timestamp: new Date().toISOString(),
      liveness: report.liveness,
      readiness: report.readiness,
      degraded: report.degraded,
    },
    { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
