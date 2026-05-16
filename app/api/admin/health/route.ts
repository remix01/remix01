/**
 * Admin API — Health Status
 * 
 * Returns real-time system health snapshot.
 * Admin-only access (role = 'admin').
 */

import { NextResponse } from 'next/server'
import { metrics } from '@/lib/monitoring/metrics'
import { withAdminAuth } from '@/lib/admin-auth'
import { getAIGuardStatus } from '@/lib/ai/ai-guard'

export const GET = withAdminAuth(async () => {
  try {
    const snapshot = await metrics.getSnapshot()
    return NextResponse.json({
      ...snapshot,
      aiReadiness: getAIGuardStatus(),
    })
  } catch (err) {
    console.error('[API] Health endpoint error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
