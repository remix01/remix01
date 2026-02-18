import { NextRequest, NextResponse } from 'next/server'
import {
  authLimiter,
  inquiryLimiter,
  offerLimiter,
  apiLimiter,
  uploadLimiter,
  searchLimiter,
} from '@/lib/rate-limit/limiters'

/**
 * Admin endpoint to view rate limiter statistics
 * GET /api/admin/rate-limit/stats
 */
export async function GET(request: NextRequest) {
  // TODO: Add proper admin role check
  // For now, this is a placeholder - you should integrate with your auth system
  const userRole = request.headers.get('x-user-role')
  
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Dostop zavrnjen. Samo administratorji.' },
      { status: 403 }
    )
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
