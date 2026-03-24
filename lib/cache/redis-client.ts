/**
 * Redis Client Singleton
 *
 * Provides a centralized Redis connection for the entire application.
 * Handles environment variable configuration and graceful fallback.
 *
 * Usage:
 *   import { getRedis } from '@/lib/cache/redis-client'
 *   const redis = getRedis()
 *   if (redis) {
 *     await redis.set('key', 'value')
 *   }
 */

import { Redis } from '@upstash/redis'

let _redis: Redis | null = null
let _initialized = false

/**
 * Get or create Redis client singleton
 */
export function getRedis(): Redis | null {
  if (_initialized) return _redis

  _initialized = true

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('[Redis] Environment variables not configured (KV_REST_API_URL, KV_REST_API_TOKEN)')
    return null
  }

  try {
    _redis = new Redis({ url, token })
    console.log('[Redis] Client initialized')
    return _redis
  } catch (err) {
    console.error('[Redis] Failed to initialize client:', err)
    return null
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null
}

/**
 * Reset Redis client (for testing)
 */
export function resetRedis(): void {
  _redis = null
  _initialized = false
}

/**
 * Generic Redis operation with error handling and graceful degradation
 */
export async function executeRedisOperation<T>(
  operation: (client: Redis) => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Unknown'
): Promise<T> {
  const client = getRedis()

  if (!client) {
    return fallbackValue
  }

  try {
    return await operation(client)
  } catch (err) {
    console.warn(`[Redis] Operation failed (${operationName}):`, err)
    return fallbackValue
  }
}
