import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// Upstash Redis client (same env vars as rateGuard.ts)
let redis: Redis | null = null
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
} catch {
  // Redis unavailable — fall back to in-memory
}

// In-memory fallback (single instance, not distributed)
const memoryWindows: Map<string, number[]> = new Map()

export class RateLimiter {
  private windowMs: number
  private maxRequests: number
  private name: string

  constructor(windowMs: number, maxRequests: number, name: string) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.name = name
  }

  /**
   * Check if request is allowed for the given identifier.
   * Uses Redis sorted-set sliding window when available; falls back to in-memory Map.
   */
  async check(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  }> {
    if (redis) {
      return this._checkRedis(identifier)
    }
    return this._checkMemory(identifier)
  }

  private async _checkRedis(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  }> {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const key = `rl:${this.name}:${identifier}`
    const ttlSeconds = Math.ceil(this.windowMs / 1000)

    // Atomic pipeline: add current timestamp, remove expired, count remaining
    const pipe = redis!.pipeline()
    pipe.zadd(key, { score: now, member: `${now}-${Math.random().toString(36).slice(2)}` })
    pipe.zremrangebyscore(key, 0, windowStart)
    pipe.zcard(key)
    pipe.expire(key, ttlSeconds)

    const results = await pipe.exec()
    const count = (results[2] as number) ?? 1

    const allowed = count <= this.maxRequests
    const remaining = Math.max(0, this.maxRequests - count)

    // Oldest member score = approximate reset time
    const oldest = await redis!.zrange(key, 0, 0, { withScores: true })
    const oldestScore = (oldest[0] as any)?.score ?? now
    const resetAt = Number(oldestScore) + this.windowMs

    if (!allowed) {
      // Remove the entry we just added so we don't inflate the count
      await redis!.zremrangebyscore(key, now, now)
    }

    return { allowed, remaining, resetAt, limit: this.maxRequests }
  }

  private _checkMemory(identifier: string): {
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  } {
    const now = Date.now()
    const windowStart = now - this.windowMs

    let timestamps = memoryWindows.get(identifier) || []
    timestamps = timestamps.filter((ts) => ts > windowStart)

    const allowed = timestamps.length < this.maxRequests

    if (allowed) {
      timestamps.push(now)
      memoryWindows.set(identifier, timestamps)
    }

    const remaining = Math.max(0, this.maxRequests - timestamps.length)
    const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : now
    const resetAt = oldestTimestamp + this.windowMs

    return { allowed, remaining, resetAt, limit: this.maxRequests }
  }

  /**
   * Get current stats for this rate limiter (memory fallback only)
   */
  getStats() {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [key, timestamps] of memoryWindows.entries()) {
      const valid = timestamps.filter((ts) => ts > windowStart)
      if (valid.length === 0) {
        memoryWindows.delete(key)
      } else {
        memoryWindows.set(key, valid)
      }
    }

    return {
      name: this.name,
      activeCount: memoryWindows.size,
      limit: this.maxRequests,
      windowMs: this.windowMs,
      backend: redis ? 'redis' : 'memory',
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
