/**
 * Rate Guard - Enforces per-user rate limits on tool calls
 * Prevents abuse by limiting requests per time window
 * Uses Upstash Redis for distributed rate limiting across all instances
 */

import { Redis } from '@upstash/redis'

// Redis client (lazy-initialized)
let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      throw new Error('Missing Upstash Redis credentials: KV_REST_API_URL, KV_REST_API_TOKEN')
    }

    redis = new Redis({ url, token })
  }
  return redis
}

// Configuration
const RATE_LIMIT_WINDOW = 60 // seconds
const RATE_LIMIT_MAX_CALLS = 20 // Max 20 tool calls per minute

/**
 * Check if user has exceeded rate limit using Redis
 * Uses a sliding window counter with TTL
 * Throws 429 if limit exceeded
 */
export async function rateGuard(userId: string): Promise<void> {
  const client = getRedis()
  const key = `ratelimit:${userId}`
  const now = Date.now()

  try {
    // Increment counter (atomic operation)
    const count = await client.incr(key)

    // Set expiration only on first request
    if (count === 1) {
      await client.expire(key, RATE_LIMIT_WINDOW)
    }

    // Check if exceeded limit
    if (count > RATE_LIMIT_MAX_CALLS) {
      const ttl = await client.ttl(key)
      const retryAfter = ttl > 0 ? ttl : RATE_LIMIT_WINDOW

      throw {
        success: false,
        error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW}s. Try again in ${retryAfter}s.`,
        code: 429,
      }
    }
  } catch (error: any) {
    // If error is a guard error, re-throw it
    if (error.code === 429) {
      throw error
    }

    // Log Redis errors but don't fail the request
    console.warn('[RATE GUARD] Redis error:', error.message)
    // Fallback: allow request to proceed (rate limiting disabled is better than blocking all requests)
  }
}

