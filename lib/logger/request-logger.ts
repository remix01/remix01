/**
 * Request Logging Middleware
 * Logs all API requests with timing and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { Logger } from './logger'

const logger = new Logger('RequestLogger')

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Extract user ID from request (if available)
 */
function extractUserId(request: NextRequest): string | undefined {
  // Try to get from Authorization header or cookie
  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    // This is a placeholder - adjust based on your auth implementation
    // Example: Bearer token might contain user ID
    return undefined // Implement based on your auth system
  }
  return undefined
}

/**
 * Middleware wrapper for request logging
 * Generates requestId, logs start/end of requests, adds X-Request-ID header
 */
export function withRequestLogger(
  handler: (req: NextRequest, requestId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    const userId = extractUserId(request)

    // Log request start
    logger.info('Request started', {
      requestId,
      method: request.method,
      pathname: request.nextUrl.pathname,
      userId,
    })

    try {
      // Call the handler with requestId
      const response = await handler(request, requestId)

      // Calculate duration
      const durationMs = Date.now() - startTime

      // Log request end
      logger.info('Request completed', {
        requestId,
        method: request.method,
        pathname: request.nextUrl.pathname,
        status: response.status,
        durationMs,
        userId,
      })

      // Add X-Request-ID header to response
      response.headers.set('X-Request-ID', requestId)

      return response
    } catch (error) {
      const durationMs = Date.now() - startTime

      // Log request error
      logger.error('Request failed', {
        requestId,
        method: request.method,
        pathname: request.nextUrl.pathname,
        durationMs,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Re-throw the error
      throw error
    }
  }
}
