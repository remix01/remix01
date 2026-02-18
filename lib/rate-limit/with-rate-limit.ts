/**
 * Higher-order function to wrap route handlers with rate limiting
 * 
 * Example usage in existing routes:
 * 
 * import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
 * import { inquiryLimiter } from '@/lib/rate-limit/limiters'
 * 
 * export const POST = withRateLimit(inquiryLimiter, async (req) => {
 *   // ... existing route handler code ...
 *   // Nothing else needs to change!
 * })
 * 
 * The wrapper will automatically:
 * - Check rate limits before calling your handler
 * - Return 429 if limit exceeded
 * - Add rate limit headers to all responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, getIdentifier } from './rate-limiter'

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse | Response>

/**
 * Wrap a route handler with rate limiting
 */
export function withRateLimit(
  limiter: RateLimiter,
  handler: RouteHandler
): RouteHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    // Extract user ID from request if authenticated
    // You can customize this based on your auth implementation
    const userId = request.headers.get('x-user-id') || undefined
    
    const identifier = getIdentifier(request, userId)
    const result = limiter.check(identifier)

    // Add rate limit headers
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

    // Call the original handler
    const response = await handler(request, context)

    // Add rate limit headers to successful responses
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
