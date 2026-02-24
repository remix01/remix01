/**
 * In-memory rate limiting utility
 * Tracks request counts per key within time windows
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if a request should be allowed based on rate limit
 * @param key - Unique identifier (e.g., user_id, IP, action)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and optional retryAfter in seconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  // No record or window expired — reset counter
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  // Hit the limit
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    }
  }

  // Increment counter and allow
  record.count++
  return { allowed: true }
}
