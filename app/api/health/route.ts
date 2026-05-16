import { NextResponse } from 'next/server'
import { getReadinessReport } from '@/lib/env'
import { getAIGuardStatus } from '@/lib/ai/ai-guard'

export async function GET() {
  const report = getReadinessReport()
  const aiStatus = getAIGuardStatus()
  const status = report.readiness.ok ? 200 : 503

  return NextResponse.json(
    {
      ok: report.readiness.ok,
      service: 'liftgo-web',
      timestamp: new Date().toISOString(),
      liveness: report.liveness,
      readiness: report.readiness,
      degraded: report.degraded,
      ai: aiStatus,
    },
    { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
