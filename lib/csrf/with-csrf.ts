/**
 * Higher-order function to wrap route handlers with CSRF origin validation.
 *
 * Example usage:
 *
 * import { withCsrf } from '@/lib/csrf/with-csrf'
 *
 * export const POST = withCsrf(async (req) => {
 *   // ... route handler ...
 * })
 *
 * Compose with rate limiting:
 *
 * export const POST = withCsrf(withRateLimit(limiter, handler))
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfOrigin, csrfForbidden } from './index'

type RouteContext = { params: Promise<unknown> }
type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse | Response>

export function withCsrf(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteContext) => {
    if (!validateCsrfOrigin(request)) {
      return csrfForbidden()
    }
    return handler(request, context)
  }
}
