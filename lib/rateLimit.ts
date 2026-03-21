/**
 * Upstash Redis-backed rate limiting utility.
 * Falls back to in-memory when Redis is unavailable (local dev).
 */
import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) return null

  try {
    _redis = new Redis({ url, token })
    return _redis
  } catch {
    return null
  }
}

// In-memory fallback for local dev
const fallbackMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if a request should be allowed based on rate limit.
 * Uses Redis sliding window when available, falls back to in-memory.
 *
 * @param key - Unique identifier (e.g., user_id, IP, action)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const client = getRedis()
  const now = Date.now()

  if (client) {
    try {
      const redisKey = `rl:${key}`
      const windowSec = Math.ceil(windowMs / 1000)

      const pipe = client.pipeline()
      pipe.incr(redisKey)
      pipe.expire(redisKey, windowSec)
      const results = await pipe.exec() as [number, unknown]
      const count = results[0]

      if (count === 1) {
        // First request in window — expiry already set above
      }

      if (count > maxRequests) {
        const ttl = await client.ttl(redisKey)
        return { allowed: false, retryAfter: Math.max(1, ttl) }
      }

      return { allowed: true }
    } catch (err) {
      console.warn('[checkRateLimit] Redis error, using in-memory fallback:', err)
    }
  }

  // In-memory fallback
  const record = fallbackMap.get(key)

  if (!record || now > record.resetAt) {
    fallbackMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }

  record.count++
  return { allowed: true }
}
