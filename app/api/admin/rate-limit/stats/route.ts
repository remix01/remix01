import { NextResponse } from 'next/server'
import {
  authLimiter,
  inquiryLimiter,
  offerLimiter,
  apiLimiter,
  uploadLimiter,
  searchLimiter,
} from '@/lib/rate-limit/limiters'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Admin endpoint to view rate limiter statistics
 * GET /api/admin/rate-limit/stats
 */
export async function GET() {
  try {
    await requireAdmin(['super_admin'])
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 403
    return NextResponse.json({ error: 'Dostop zavrnjen. Samo administratorji.' }, { status })
  }

  const stats = {
    timestamp: new Date().toISOString(),
    limiters: [
      authLimiter.getStats(),
      inquiryLimiter.getStats(),
      offerLimiter.getStats(),
      apiLimiter.getStats(),
      uploadLimiter.getStats(),
      searchLimiter.getStats(),
    ],
  }

  return NextResponse.json(stats)
}
