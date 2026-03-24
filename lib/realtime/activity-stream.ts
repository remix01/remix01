/**
 * Real-time Activity Stream
 *
 * Track and retrieve activity events for entities
 * Provides audit trail and activity feed
 */

import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys'
import { pushToList, getListRange } from '../cache/strategies'

export interface ActivityEvent {
  id: string
  type: 'created' | 'updated' | 'deleted' | 'commented' | 'accepted' | 'rejected' | 'completed' | 'custom'
  entityType: string
  entityId: string
  userId: string
  userName?: string
  message?: string
  metadata?: Record<string, any>
  timestamp: number
}

/**
 * Log an activity event
 */
export async function logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent> {
  const activityEvent: ActivityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    ...event,
  }

  const key = CACHE_KEYS.activityStream(event.entityType, event.entityId)

  // Push to list (keep last 200 activities)
  await pushToList(key, activityEvent, 200)

  return activityEvent
}

/**
 * Get activity stream for an entity
 */
export async function getActivityStream(entityType: string, entityId: string, limit: number = 50): Promise<ActivityEvent[]> {
  const key = CACHE_KEYS.activityStream(entityType, entityId)

  const activities = await getListRange<ActivityEvent>(key, 0, limit - 1)

  return activities.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Clear activity stream for an entity
 */
export async function clearActivityStream(entityType: string, entityId: string): Promise<void> {
  const redis = getRedis()

  if (!redis) return

  try {
    const key = CACHE_KEYS.activityStream(entityType, entityId)
    await redis.del(key)
  } catch (err) {
    console.warn('[Activity] Failed to clear stream:', err)
  }
}
