import { NextRequest } from 'next/server'

/**
 * Sliding window rate limiter using in-memory storage
 * TODO: Replace Map with Redis (ioredis) for production distributed rate limiting
 */
export class RateLimiter {
  private windows: Map<string, number[]> = new Map()
  private windowMs: number
  private maxRequests: number
  private name: string

  constructor(windowMs: number, maxRequests: number, name: string) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.name = name
  }

  /**
   * Check if request is allowed for the given identifier
   * Automatically cleans up expired timestamps
   */
  check(identifier: string): {
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  } {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Get existing timestamps for this identifier
    let timestamps = this.windows.get(identifier) || []

    // Remove expired timestamps (cleanup)
    timestamps = timestamps.filter((ts) => ts > windowStart)

    // Check if under limit
    const allowed = timestamps.length < this.maxRequests

    if (allowed) {
      // Add current timestamp
      timestamps.push(now)
      this.windows.set(identifier, timestamps)
      // TODO: Redis implementation would use: 
      // await redis.zadd(identifier, now, `${now}`)
      // await redis.zremrangebyscore(identifier, 0, windowStart)
      // await redis.expire(identifier, Math.ceil(this.windowMs / 1000))
    }

    const remaining = Math.max(0, this.maxRequests - timestamps.length)
    const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : now
    const resetAt = oldestTimestamp + this.windowMs

    return {
      allowed,
      remaining,
      resetAt,
      limit: this.maxRequests,
    }
  }

  /**
   * Get current stats for this rate limiter
   */
  getStats() {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean up expired entries
    for (const [key, timestamps] of this.windows.entries()) {
      const validTimestamps = timestamps.filter((ts) => ts > windowStart)
      if (validTimestamps.length === 0) {
        this.windows.delete(key)
      } else {
        this.windows.set(key, validTimestamps)
      }
    }

    return {
      name: this.name,
      activeCount: this.windows.size,
      limit: this.maxRequests,
      windowMs: this.windowMs,
    }
  }
}

/**
 * Extract identifier from request (user ID or IP address)
 */
export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }

  return 'anonymous'
}
