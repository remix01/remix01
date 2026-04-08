/**
 * Redis Metrics Collection
 *
 * Collect and aggregate metrics for analytics, monitoring, and dashboards
 * Tracks API performance, cache efficiency, user engagement, etc.
 */

import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_TTL, incrementCounter } from '../cache'

export interface Metric {
  key: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

export interface MetricsSnapshot {
  timestamp: number
  metrics: Record<string, number>
}

/**
 * Record a metric value
 */
export async function recordMetric(key: string, value: number = 1, timestamp: number = Date.now()): Promise<void> {
  const date = new Date(timestamp).toISOString().split('T')[0]
  const metricsKey = `metrics:${key}:${date}`

  await incrementCounter(metricsKey, value, CACHE_TTL.VERY_LONG)
}

/**
 * Record API endpoint metric
 */
export async function recordAPIMetric(endpoint: string, responseTime: number, status: number, userId?: string): Promise<void> {
  const date = new Date().toISOString().split('T')[0]

  // Record endpoint count
  await recordMetric(`api:${endpoint}:count`, 1)

  // Record response time histogram (p50, p95, p99)
  await recordMetric(`api:${endpoint}:response_time`, responseTime)

  // Record status code
  const statusCategory = Math.floor(status / 100)
  await recordMetric(`api:${endpoint}:status_${statusCategory}xx`, 1)

  // Record by user if available
  if (userId) {
    await recordMetric(`user:${userId}:api_calls`, 1)
  }
}

/**
 * Record cache hit/miss
 */
export async function recordCacheMetric(hit: boolean, key?: string): Promise<void> {
  const type = hit ? 'hit' : 'miss'
  await recordMetric(`cache:${type}`, 1)

  if (key) {
    const keyPrefix = key.split(':')[0]
    await recordMetric(`cache:${keyPrefix}:${type}`, 1)
  }
}

/**
 * Record user engagement
 */
export async function recordUserEngagement(userId: string, action: string, metadata?: Record<string, any>): Promise<void> {
  await recordMetric(`engagement:${action}:total`, 1)
  await recordMetric(`engagement:${action}:user:${userId}`, 1)

  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'number') {
        await recordMetric(`engagement:${action}:${key}`, value)
      }
    }
  }
}

/**
 * Record error metric
 */
export async function recordErrorMetric(errorType: string, endpoint?: string, userId?: string): Promise<void> {
  await recordMetric(`error:${errorType}:total`, 1)

  if (endpoint) {
    await recordMetric(`error:${errorType}:endpoint:${endpoint}`, 1)
  }

  if (userId) {
    await recordMetric(`error:${errorType}:user:${userId}`, 1)
  }
}

/**
 * Record search metric
 */
export async function recordSearchMetric(query: string, resultCount: number, responseTime: number): Promise<void> {
  await recordMetric(`search:queries`, 1)
  await recordMetric(`search:response_time`, responseTime)
  await recordMetric(`search:results:total`, resultCount)

  if (resultCount === 0) {
    await recordMetric(`search:no_results`, 1)
  }
}

/**
 * Record database operation metric
 */
export async function recordDatabaseMetric(operation: 'create' | 'read' | 'update' | 'delete', entity: string, responseTime?: number): Promise<void> {
  await recordMetric(`db:${operation}:total`, 1)
  await recordMetric(`db:${operation}:${entity}`, 1)

  if (responseTime) {
    await recordMetric(`db:${operation}:response_time`, responseTime)
  }
}

/**
 * Get metrics for a specific key and date range
 */
export async function getMetrics(key: string, daysBack: number = 1): Promise<Record<string, number>> {
  const redis = getRedis()

  if (!redis) return {}

  try {
    const metrics: Record<string, number> = {}
    const now = new Date()

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const metricsKey = `metrics:${key}:${dateStr}`

      const value = await redis.get<number>(metricsKey)
      metrics[dateStr] = value || 0
    }

    return metrics
  } catch (err) {
    console.warn('[Metrics] Failed to get metrics:', err)
    return {}
  }
}

/**
 * Get API metrics summary
 */
export async function getAPIMetricsSummary(endpoint: string, daysBack: number = 7): Promise<{
  totalRequests: number
  avgResponseTime: number
  successRate: number
  errorRate: number
}> {
  const redis = getRedis()

  if (!redis) return { totalRequests: 0, avgResponseTime: 0, successRate: 0, errorRate: 0 }

  try {
    let totalRequests = 0
    let successRequests = 0
    let errorRequests = 0
    let totalResponseTime = 0
    let responseTimeCount = 0

    const now = new Date()

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const countKey = `metrics:api:${endpoint}:count:${dateStr}`
      const statusKey = `metrics:api:${endpoint}:status_2xx:${dateStr}`
      const errorKey = `metrics:api:${endpoint}:status_5xx:${dateStr}`
      const responseTimeKey = `metrics:api:${endpoint}:response_time:${dateStr}`

      const count = (await redis.get<number>(countKey)) || 0
      const success = (await redis.get<number>(statusKey)) || 0
      const errors = (await redis.get<number>(errorKey)) || 0
      const responseTime = (await redis.get<number>(responseTimeKey)) || 0

      totalRequests += count
      successRequests += success
      errorRequests += errors
      totalResponseTime += responseTime
      responseTimeCount += count
    }

    return {
      totalRequests,
      avgResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      successRate: totalRequests > 0 ? (successRequests / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
    }
  } catch (err) {
    console.warn('[Metrics] Failed to get API summary:', err)
    return { totalRequests: 0, avgResponseTime: 0, successRate: 0, errorRate: 0 }
  }
}

/**
 * Get cache performance metrics
 */
export async function getCachePerformance(daysBack: number = 7): Promise<{
  hitRate: number
  missRate: number
  totalRequests: number
}> {
  const redis = getRedis()

  if (!redis) return { hitRate: 0, missRate: 0, totalRequests: 0 }

  try {
    let totalHits = 0
    let totalMisses = 0

    const now = new Date()

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const hitKey = `metrics:cache:hit:${dateStr}`
      const missKey = `metrics:cache:miss:${dateStr}`

      const hits = (await redis.get<number>(hitKey)) || 0
      const misses = (await redis.get<number>(missKey)) || 0

      totalHits += hits
      totalMisses += misses
    }

    const totalRequests = totalHits + totalMisses

    return {
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
      totalRequests,
    }
  } catch (err) {
    console.warn('[Metrics] Failed to get cache performance:', err)
    return { hitRate: 0, missRate: 0, totalRequests: 0 }
  }
}

/**
 * Get top endpoints by request count
 */
export async function getTopEndpoints(limit: number = 10, daysBack: number = 7): Promise<Array<{ endpoint: string; count: number }>> {
  const redis = getRedis()

  if (!redis) return []

  try {
    const endpointCounts: Record<string, number> = {}
    let cursor = '0'

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    do {
      const scanResult = await redis.scan(parseInt(cursor), {
        match: `metrics:api:*:count:${dateStr}`,
        count: 100,
      })

      cursor = scanResult[0]
      const keys = (scanResult[1] as string[]) || []

      for (const key of keys) {
        const match = key.match(/metrics:api:(.+):count:/)
        if (match) {
          const endpoint = match[1]
          const count = (await redis.get<number>(key)) || 0

          endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count
        }
      }
    } while (cursor !== '0')

    return Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }))
  } catch (err) {
    console.warn('[Metrics] Failed to get top endpoints:', err)
    return []
  }
}
