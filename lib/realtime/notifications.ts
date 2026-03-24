/**
 * Real-time Notifications
 *
 * Queue and manage real-time notifications for users
 * Supports in-app and push notifications
 */

import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys'
import { pushToList, getListRange, incrementCounter } from '../cache/strategies'

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error' | 'task-update' | 'bid-received' | 'message'
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: number
  expiresAt?: number
}

/**
 * Create and queue a notification
 */
export async function createNotification(payload: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    read: false,
    ...payload,
  }

  const key = CACHE_KEYS.userNotifications(payload.userId)

  // Add to notification queue (FIFO, keep last 100)
  await pushToList(key, notification, 100)

  // Increment unread count
  await incrementCounter(CACHE_KEYS.unreadCount(payload.userId), 1, CACHE_TTL.LONG)

  return notification
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
  const key = CACHE_KEYS.userNotifications(userId)

  const notifications = await getListRange<Notification>(key, 0, limit - 1)

  return notifications.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const redis = getRedis()

  if (!redis) return 0

  try {
    const key = CACHE_KEYS.unreadCount(userId)
    const count = await redis.get<number>(key)
    return count || 0
  } catch (err) {
    console.warn('[Notifications] Failed to get unread count:', err)
    return 0
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  const notifications = await getUserNotifications(userId)
  const key = CACHE_KEYS.userNotifications(userId)

  const updated = notifications.map((n) => {
    if (n.id === notificationId && !n.read) {
      return { ...n, read: true }
    }
    return n
  })

  await executeRedisOperation(
    async (redis) => {
      await redis.del(key)
      // Re-add all notifications
      for (const notif of updated) {
        await redis.lpush(key, JSON.stringify(notif))
      }
      await redis.expire(key, CACHE_TTL.LONG)
    },
    undefined,
    `notification:mark-read:${userId}:${notificationId}`
  )

  // Decrement unread count
  const unreadCount = await getUnreadNotificationCount(userId)
  if (unreadCount > 0) {
    const unreadKey = CACHE_KEYS.unreadCount(userId)
    await executeRedisOperation(
      async (redis) => {
        await redis.decrby(unreadKey, 1)
      },
      undefined,
      `notification:unread-decr:${userId}`
    )
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifications = await getUserNotifications(userId)
  const key = CACHE_KEYS.userNotifications(userId)

  const updated = notifications.map((n) => ({ ...n, read: true }))

  await executeRedisOperation(
    async (redis) => {
      await redis.del(key)
      // Re-add all notifications
      for (const notif of updated) {
        await redis.lpush(key, JSON.stringify(notif))
      }
      await redis.expire(key, CACHE_TTL.LONG)
    },
    undefined,
    `notification:mark-all-read:${userId}`
  )

  // Reset unread count
  const unreadKey = CACHE_KEYS.unreadCount(userId)
  await executeRedisOperation(
    async (redis) => {
      await redis.del(unreadKey)
    },
    undefined,
    `notification:unread-reset:${userId}`
  )
}

/**
 * Delete notification
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const notifications = await getUserNotifications(userId)
  const key = CACHE_KEYS.userNotifications(userId)

  const filtered = notifications.filter((n) => n.id !== notificationId)

  await executeRedisOperation(
    async (redis) => {
      await redis.del(key)
      // Re-add filtered notifications
      for (const notif of filtered) {
        await redis.lpush(key, JSON.stringify(notif))
      }
      await redis.expire(key, CACHE_TTL.LONG)
    },
    undefined,
    `notification:delete:${userId}:${notificationId}`
  )
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  const key = CACHE_KEYS.userNotifications(userId)
  const unreadKey = CACHE_KEYS.unreadCount(userId)

  await executeRedisOperation(
    async (redis) => {
      await redis.del(key, unreadKey)
    },
    undefined,
    `notification:clear-all:${userId}`
  )
}

/**
 * Broadcast notification to multiple users
 */
export async function broadcastNotification(userIds: string[], notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>): Promise<void> {
  const promises = userIds.map((userId) =>
    createNotification({
      ...notification,
      userId,
    })
  )

  await Promise.all(promises)
}
