import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const CACHE_TTL_SECONDS = 24 * 60 * 60 // 24 hours

let redis: Redis | null = null
let redisDisabled = false
let redisAuthWarningLogged = false

function isRedisAuthError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('WRONGPASS') || message.includes('http_unauthorized') || message.includes('invalid or missing auth token')
}

function getRedis(): Redis | null {
  if (redisDisabled) return null
  if (redis) return redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return redis
}

export function buildCacheKey(message: string): string {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ')
  return `ai:chat:${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`
}

export async function getCachedResponse(cacheKey: string): Promise<string | null> {
  const client = getRedis()
  if (!client) return null
  try {
    const cached = await client.get<string>(cacheKey)
    return cached ?? null
  } catch (err) {
    if (isRedisAuthError(err)) {
      redisDisabled = true
      if (!redisAuthWarningLogged) {
        redisAuthWarningLogged = true
        console.warn('[ai-cache] Redis disabled due to invalid auth token')
      }
      return null
    }
    console.warn('[ai-cache] Redis get error:', err)
    return null
  }
}

export async function setCachedResponse(cacheKey: string, response: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.set(cacheKey, response, { ex: CACHE_TTL_SECONDS })
  } catch (err) {
    if (isRedisAuthError(err)) {
      redisDisabled = true
      if (!redisAuthWarningLogged) {
        redisAuthWarningLogged = true
        console.warn('[ai-cache] Redis disabled due to invalid auth token')
      }
      return
    }
    console.warn('[ai-cache] Redis set error:', err)
  }
}
