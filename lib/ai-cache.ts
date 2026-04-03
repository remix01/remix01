import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const CACHE_TTL_SECONDS = 24 * 60 * 60 // 24 hours

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  
  // Use the correct environment variable names from Upstash integration
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (!url || !token) {
    console.warn('[ai-cache] Redis credentials missing. Expected KV_REST_API_URL and KV_REST_API_TOKEN')
    return null
  }
  
  try {
    redis = new Redis({
      url,
      token,
    })
    return redis
  } catch (err) {
    console.error('[ai-cache] Failed to initialize Redis client:', err)
    return null
  }
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
    console.warn('[ai-cache] Redis get error:', err)
    // Gracefully degrade - continue without cache on error
    return null
  }
}

export async function setCachedResponse(cacheKey: string, response: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.set(cacheKey, response, { ex: CACHE_TTL_SECONDS })
  } catch (err) {
    console.warn('[ai-cache] Redis set error:', err)
    // Gracefully degrade - don't fail if cache write fails
  }
}
