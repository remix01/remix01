/**
 * Rate Guard - Enforces per-user rate limits on tool calls
 * Prevents abuse by limiting requests per time window
 */

// In-memory store for rate limiting
// In production, this should use Redis
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 60 seconds
const RATE_LIMIT_MAX_CALLS = 20 // Max 20 tool calls per minute

/**
 * Clean up expired rate limit entries (runs once per minute)
 */
function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupRateLimitStore, 60 * 1000)

/**
 * Check if user has exceeded rate limit
 * Throws 429 if limit exceeded
 */
export async function rateGuard(userId: string): Promise<void> {
  const now = Date.now()
  const key = `ratelimit:${userId}`

  let entry = rateLimitStore.get(key)

  // Create new entry if expired or doesn't exist
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW,
    }
    rateLimitStore.set(key, entry)
  }

  // Increment counter
  entry.count++

  // Check if exceeded
  if (entry.count > RATE_LIMIT_MAX_CALLS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    throw {
      success: false,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      code: 429,
    }
  }
}
