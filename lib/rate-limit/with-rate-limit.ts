/**
 * Higher-order function to wrap route handlers with rate limiting.
 *
 * Example usage:
 *
 * import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
 * import { inquiryLimiter } from '@/lib/rate-limit/limiters'
 *
 * export const POST = withRateLimit(inquiryLimiter, async (req) => {
 *   // ... existing route handler code ...
 * })
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, getIdentifier } from './rate-limiter'

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse | Response>

/**
 * Wrap a route handler with async Redis-backed rate limiting.
 */
export function withRateLimit(limiter: RateLimiter, handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const userId = request.headers.get('x-user-id') || undefined
    const identifier = getIdentifier(request, userId)
    const result = await limiter.check(identifier)

    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)

      return NextResponse.json(
        {
          error: 'Preveč zahtev. Prosimo počakajte.',
          code: 'RATE_LIMITED',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    const response = await handler(request, context)

    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    Object.entries(headers).forEach(([key, value]) => {
      newResponse.headers.set(key, value)
    })

    return newResponse
  }
}
