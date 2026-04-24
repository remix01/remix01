/**
 * Admin API — Health Status
 * 
 * Returns real-time system health snapshot.
 * Admin-only access (role = 'admin').
 */

import { metrics } from '@/lib/monitoring/metrics'
import { withAdminAuth } from '@/lib/admin-auth'
import { ok, fail } from '@/lib/http/response'

export const GET = withAdminAuth(async () => {
  try {
    const snapshot = await metrics.getSnapshot()
    return Response.json(snapshot)
  } catch (err) {
    console.error('[API] Health endpoint error:', err)
    return fail('Internal server error', 500)
  }
})
