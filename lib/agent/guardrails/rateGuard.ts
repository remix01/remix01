/**
 * Rate Guard - Enforces per-user rate limits on tool calls via Redis
 * Prevents abuse by limiting requests per time window
 * Uses Upstash Redis for distributed rate limiting across instances
 */

// Configuration
const RATE_LIMIT_WINDOW = 60 // 60 seconds
const RATE_LIMIT_MAX_CALLS = 20 // Max 20 tool calls per minute
const FALLBACK_IN_MEMORY = new Map<string, { count: number; resetAt: number }>() // Fallback if Redis unavailable

/**
 * Get Redis client
 */
function getRedis() {
  try {
    const { Redis } = require('@upstash/redis')
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    
    if (!url || !token) {
      return null
    }
    
    return new Redis({ url, token })
  } catch (e) {
    return null
  }
}

/**
 * Check if user has exceeded rate limit using Redis
 * Falls back to in-memory store if Redis unavailable
 * Throws 429 if limit exceeded
 */
export async function rateGuard(userId: string): Promise<void> {
  const key = `guardrail:ratelimit:${userId}`
  const redis = getRedis()

  try {
    if (redis) {
      // Use Redis for distributed rate limiting
      const current = await redis.incr(key)
      
      // Set expiration on first increment
      if (current === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW)
      }

      if (current > RATE_LIMIT_MAX_CALLS) {
        const ttl = await redis.ttl(key)
        const retryAfter = Math.max(1, ttl || RATE_LIMIT_WINDOW)
        throw {
          success: false,
          error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX_CALLS} tool calls per minute. Try again in ${retryAfter} seconds.`,
          code: 429,
        }
      }
      
      return
    }
  } catch (error: any) {
    // If Redis fails, fall back to in-memory
    if (error.code !== 429) {
      console.warn('[GUARDRAIL] Redis rate limit failed, using in-memory fallback', error)
    } else {
      throw error
    }
  }

  // In-memory fallback (for local dev or Redis unavailable)
  const now = Date.now()
  let entry = FALLBACK_IN_MEMORY.get(key)

  // Create new entry if expired or doesn't exist
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW * 1000,
    }
    FALLBACK_IN_MEMORY.set(key, entry)
  }

  // Increment counter
  entry.count++

  // Check if exceeded
  if (entry.count > RATE_LIMIT_MAX_CALLS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    throw {
      success: false,
      error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX_CALLS} tool calls per minute. Try again in ${retryAfter} seconds.`,
      code: 429,
    }
  }
}

/**
 * Clean up expired in-memory entries (fallback cleanup)
 * Called periodically to prevent memory leaks
 */
export function cleanupFallbackStore(): void {
  const now = Date.now()
  for (const [key, entry] of FALLBACK_IN_MEMORY.entries()) {
    if (entry.resetAt < now) {
      FALLBACK_IN_MEMORY.delete(key)
    }
  }
}

// Run cleanup every 60 seconds for in-memory fallback
if (typeof window === 'undefined') {
  setInterval(cleanupFallbackStore, 60 * 1000)
}
