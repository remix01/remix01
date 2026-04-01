/**
 * Cache Strategies
 *
 * Common patterns and helpers for Redis caching operations.
 * Includes get, set, delete, and bulk operations with TTL management.
 */

import { getRedis, executeRedisOperation } from './redis-client'
import { CACHE_TTL, getTTLForKey } from './cache-keys'

/**
 * Get value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  return executeRedisOperation(
    async (redis) => {
      const value = await redis.get<T>(key)
      return value ?? null
    },
    null,
    `cache:get:${key}`
  )
}

/**
 * Set value in cache with optional TTL
 */
export async function setInCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const ttl = ttlSeconds ?? getTTLForKey(key.split(':')[0])

  await executeRedisOperation(
    async (redis) => {
      if (ttl && ttl > 0) {
        await redis.set(key, value, { ex: ttl })
      } else {
        await redis.set(key, value)
      }
    },
    undefined,
    `cache:set:${key}`
  )
}

/**
 * Delete value from cache
 */
export async function deleteFromCache(key: string): Promise<void> {
  await executeRedisOperation(
    async (redis) => {
      await redis.del(key)
    },
    undefined,
    `cache:delete:${key}`
  )
}

/**
 * Delete multiple keys from cache
 */
export async function deleteManyFromCache(keys: string[]): Promise<void> {
  if (keys.length === 0) return

  await executeRedisOperation(
    async (redis) => {
      await redis.del(...(keys as [string, ...string[]]))
    },
    undefined,
    `cache:delete-many:${keys.length}`
  )
}

/**
 * Check if key exists in cache
 */
export async function cacheKeyExists(key: string): Promise<boolean> {
  return executeRedisOperation(
    async (redis) => {
      const exists = await redis.exists(key)
      return exists === 1
    },
    false,
    `cache:exists:${key}`
  )
}

/**
 * Get time-to-live for a key
 */
export async function getCacheTTL(key: string): Promise<number> {
  return executeRedisOperation(
    async (redis) => {
      const ttl = await redis.ttl(key)
      return ttl ?? -1 // -1 if key doesn't exist or has no expiry
    },
    -1,
    `cache:ttl:${key}`
  )
}

/**
 * Increment a counter in cache
 */
export async function incrementCounter(key: string, amount: number = 1, ttlSeconds?: number): Promise<number> {
  return executeRedisOperation(
    async (redis) => {
      const pipe = redis.pipeline()
      pipe.incrby(key, amount)
      if (ttlSeconds && ttlSeconds > 0) {
        pipe.expire(key, ttlSeconds)
      }
      const results = (await pipe.exec()) as [number]
      return results[0] ?? 0
    },
    0,
    `cache:increment:${key}`
  )
}

/**
 * Get or set pattern: if key exists, return it; otherwise set and return value
 */
export async function getOrSetCache<T>(
  key: string,
  getter: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cached = await getFromCache<T>(key)

  if (cached !== null) {
    return cached
  }

  const fresh = await getter()
  await setInCache(key, fresh, ttlSeconds)
  return fresh
}

/**
 * Invalidate keys matching a pattern (e.g., "user:profile:*")
 * WARNING: This uses SCAN, which may not be atomic and could miss keys on large datasets
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  return executeRedisOperation(
    async (redis) => {
      let cursor = '0'
      let deletedCount = 0

      do {
        const scanResult = await redis.scan(parseInt(cursor), {
          match: pattern,
          count: 100,
        })

        cursor = scanResult[0]
        const keys = scanResult[1] as string[]

        if (keys.length > 0) {
          deletedCount += keys.length
          await redis.del(...(keys as [string, ...string[]]))
        }
      } while (cursor !== '0')

      return deletedCount
    },
    0,
    `cache:invalidate-pattern:${pattern}`
  )
}

/**
 * Batch get multiple keys
 */
export async function mgetFromCache<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return []

  return executeRedisOperation(
    async (redis) => {
      const values = (await redis.mget(...(keys as [string, ...string[]]))) as (T | null)[]
      return values.map((v) => v ?? null)
    },
    keys.map(() => null),
    `cache:mget:${keys.length}`
  )
}

/**
 * Batch set multiple key-value pairs
 */
export async function msetInCache(pairs: Array<[string, any]>, ttlSeconds?: number): Promise<void> {
  if (pairs.length === 0) return

  await executeRedisOperation(
    async (redis) => {
      if (ttlSeconds && ttlSeconds > 0) {
        const pipe = redis.pipeline()
        for (const [key, value] of pairs) {
          pipe.set(key, value, { ex: ttlSeconds })
        }
        await pipe.exec()
      } else {
        const pairsRecord: Record<string, any> = {}
        for (const [key, value] of pairs) {
          pairsRecord[key] = value
        }
        await redis.mset(pairsRecord)
      }
    },
    undefined,
    `cache:mset:${pairs.length}`
  )
}

/**
 * Push value to a list
 */
export async function pushToList(key: string, value: any, maxLength?: number): Promise<number> {
  return executeRedisOperation(
    async (redis) => {
      const pipe = redis.pipeline()
      pipe.lpush(key, value)
      if (maxLength) {
        pipe.ltrim(key, 0, maxLength - 1)
      }
      const results = (await pipe.exec()) as [number]
      return results[0] ?? 0
    },
    0,
    `cache:lpush:${key}`
  )
}

/**
 * Get list range
 */
export async function getListRange<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
  return executeRedisOperation(
    async (redis) => {
      const list = await redis.lrange<T>(key, start, stop)
      return list || []
    },
    [],
    `cache:lrange:${key}`
  )
}

/**
 * Add to set
 */
export async function addToSet(key: string, ...members: string[]): Promise<number> {
  if (members.length === 0) return 0

  return executeRedisOperation(
    async (redis) => {
      const result = await redis.sadd(key, ...(members as [string, ...string[]]))
      return result ?? 0
    },
    0,
    `cache:sadd:${key}`
  )
}

/**
 * Get all members of a set
 */
export async function getSetMembers(key: string): Promise<string[]> {
  return executeRedisOperation(
    async (redis) => {
      const members = await redis.smembers(key)
      return members || []
    },
    [],
    `cache:smembers:${key}`
  )
}

/**
 * Cache statistics helper
 */
export async function getCacheStats(): Promise<{
  isAvailable: boolean
  keys?: string
  memory?: string
}> {
  const redis = getRedis()

  if (!redis) {
    return { isAvailable: false }
  }

  try {
    const info = await (redis as any).call<string>('info')
    
    // Parse the INFO response which is a raw string
    const infoStr = typeof info === 'string' ? info : String(info)
    const keyspaceMatch = infoStr.match(/db0:keys=(\d+)/)
    const memoryMatch = infoStr.match(/used_memory_human:(.+?)\r/)
    
    return {
      isAvailable: true,
      keys: keyspaceMatch?.[1] || 'unknown',
      memory: memoryMatch?.[1] || 'unknown',
    }
  } catch (err) {
    console.warn('[Cache] Failed to get stats:', err)
    return { isAvailable: false }
  }
}
