/**
 * Rate limiting utility for category creation using Upstash Redis
 * Prevents abuse by limiting category creations per user and per IP
 */

import { Redis } from '@upstash/redis'
import { identifySystemHealth, trackInternalMetric } from '@/lib/analytics/segmentInternal'

let redisClient: Redis | null | undefined

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    redisClient = null
    return redisClient
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check and increment rate limit for category creation by user
 * Limit: 10 creations per user per hour
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `rate-limit:category-creation:user:${userId}`
  const limit = 10
  const windowSeconds = 3600 // 1 hour

  return checkRateLimit(key, limit, windowSeconds)
}

/**
 * Check and increment rate limit for category creation by IP address
 * Limit: 100 creations per IP per day
 */
export async function checkIpRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const key = `rate-limit:category-creation:ip:${ipAddress}`
  const limit = 100
  const windowSeconds = 86400 // 24 hours

  return checkRateLimit(key, limit, windowSeconds)
}

/**
 * Generic rate limit checker using token bucket algorithm
 */
async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedisClient()

  if (!redis) {
    trackInternalMetric('System Health: Redis Fallback Triggered', {
      reason: 'missing_redis_configuration',
      rateLimitKey: key,
      windowSeconds,
    })
    identifySystemHealth({
      redis_available: false,
      redis_fallback_triggered: true,
      redis_fallback_reason: 'missing_redis_configuration',
    })

    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    }
  }

  try {
    // Get current count
    const current = await redis.incr(key)

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    // Get TTL for reset time
    const ttl = await redis.ttl(key)
    const resetAt = new Date(Date.now() + (ttl * 1000))

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error)
    trackInternalMetric('System Health: Redis Fallback Triggered', {
      reason: 'redis_operation_failed',
      rateLimitKey: key,
      error: error instanceof Error ? error.message : String(error),
    })
    identifySystemHealth({
      redis_available: false,
      redis_fallback_triggered: true,
      redis_fallback_reason: 'redis_operation_failed',
    })
    // Fail open - allow if Redis is unavailable
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + 3600000),
    }
  }
}

/**
 * Reset rate limit for testing purposes (admin only)
 */
export async function resetRateLimitForTesting(keyPattern: string): Promise<void> {
  try {
    // In a real app, this would use Redis SCAN to delete keys matching pattern
    // For now, we'll just log that this would be called
    console.log(`[RateLimit] Would reset keys matching pattern: ${keyPattern}`)
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error)
  }
}
