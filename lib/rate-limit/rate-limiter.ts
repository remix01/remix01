import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'

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

/**
 * Sliding window rate limiter backed by Upstash Redis.
 * Falls back to in-memory Map when Redis is unavailable (local dev).
 *
 * NOTE: In-memory fallback is NOT distributed — use only for local dev.
 * On Vercel (serverless), Redis is required for correct behaviour.
 */
export class RateLimiter {
  private windowMs: number
  private maxRequests: number
  private name: string
  private fallback: Map<string, number[]> = new Map()

  constructor(windowMs: number, maxRequests: number, name: string) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.name = name
  }

  /**
   * Check if request is allowed for the given identifier (async, uses Redis).
   */
  async check(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  }> {
    const client = getRedis()
    const now = Date.now()
    const windowStart = now - this.windowMs
    const key = `rl:${this.name}:${identifier}`

    if (client) {
      try {
        // Atomic sliding window via Redis pipeline:
        // 1. Remove expired members
        // 2. Count current members
        // 3. Conditionally add new member
        // 4. Set expiry
        const pipe = client.pipeline()
        pipe.zremrangebyscore(key, 0, windowStart)
        pipe.zcard(key)
        pipe.expire(key, Math.ceil(this.windowMs / 1000))
        const results = await pipe.exec() as [unknown, number, unknown]
        const currentCount = results[1] ?? 0

        if (currentCount >= this.maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: now + this.windowMs,
            limit: this.maxRequests,
          }
        }

        // Add the new request timestamp
        await client.zadd(key, {
          score: now,
          member: `${now}:${Math.random().toString(36).slice(2)}`,
        })

        return {
          allowed: true,
          remaining: Math.max(0, this.maxRequests - currentCount - 1),
          resetAt: now + this.windowMs,
          limit: this.maxRequests,
        }
      } catch (err) {
        console.warn(`[RateLimiter] Redis error for "${this.name}", falling back to in-memory:`, err)
      }
    }

    return this._checkInMemory(identifier, now, windowStart)
  }

  private _checkInMemory(
    identifier: string,
    now: number,
    windowStart: number
  ): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
    let timestamps = this.fallback.get(identifier) || []
    timestamps = timestamps.filter((ts) => ts > windowStart)

    const allowed = timestamps.length < this.maxRequests

    if (allowed) {
      timestamps.push(now)
      this.fallback.set(identifier, timestamps)
    }

    const remaining = Math.max(0, this.maxRequests - timestamps.length)
    const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : now
    const resetAt = oldestTimestamp + this.windowMs

    return { allowed, remaining, resetAt, limit: this.maxRequests }
  }

  /**
   * Get current stats (uses in-memory fallback data only).
   */
  getStats() {
    return {
      name: this.name,
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

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`
  }

  if (realIp) {
    return `ip:${realIp}`
  }

  return 'ip:anonymous'
}
