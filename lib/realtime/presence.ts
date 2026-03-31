/**
 * Real-time Presence Tracking
 *
 * Track who is currently online using Redis
 * Useful for showing user activity, availability, etc.
 */

import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys'

export interface UserPresence {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen: number
  currentPage?: string
  currentRoom?: string
}

/**
 * Set user as online
 */
export async function setUserOnline(userId: string, metadata?: { currentPage?: string; currentRoom?: string }): Promise<void> {
  const cacheKey = CACHE_KEYS.userOnline(userId)

  const presence: UserPresence = {
    userId,
    status: 'online',
    lastSeen: Date.now(),
    currentPage: metadata?.currentPage,
    currentRoom: metadata?.currentRoom,
  }

  // Keep presence for 5 minutes (will be refreshed on activity)
  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(presence), { ex: CACHE_TTL.SHORT })
    },
    undefined,
    `presence:online:${userId}`
  )
}

/**
 * Set user as away
 */
export async function setUserAway(userId: string): Promise<void> {
  const cacheKey = CACHE_KEYS.userOnline(userId)
  const presence: UserPresence = {
    userId,
    status: 'away',
    lastSeen: Date.now(),
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(presence), { ex: CACHE_TTL.SHORT })
    },
    undefined,
    `presence:away:${userId}`
  )
}

/**
 * Set user as offline
 */
export async function setUserOffline(userId: string): Promise<void> {
  const cacheKey = CACHE_KEYS.userOnline(userId)

  await executeRedisOperation(
    async (redis) => {
      await redis.del(cacheKey)
    },
    undefined,
    `presence:offline:${userId}`
  )
}

/**
 * Get user presence
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  const cacheKey = CACHE_KEYS.userOnline(userId)

  return executeRedisOperation(
    async (redis) => {
      const data = await redis.get<string>(cacheKey)
      if (!data) return null

      try {
        return JSON.parse(data) as UserPresence
      } catch {
        return null
      }
    },
    null,
    `presence:get:${userId}`
  )
}

/**
 * Get all online users in a room
 */
export async function getOnlineUsersInRoom(roomId: string): Promise<UserPresence[]> {
  const cacheKey = CACHE_KEYS.onlineUsers(roomId)

  return executeRedisOperation(
    async (redis) => {
      const data = await redis.get<string>(cacheKey)
      if (!data) return []

      try {
        return JSON.parse(data) as UserPresence[]
      } catch {
        return []
      }
    },
    [],
    `presence:room:${roomId}`
  )
}

/**
 * Add user to room
 */
export async function addUserToRoom(roomId: string, userId: string): Promise<void> {
  const users = await getOnlineUsersInRoom(roomId)
  const cacheKey = CACHE_KEYS.onlineUsers(roomId)

  let presence = await getUserPresence(userId)
  if (!presence) {
    presence = {
      userId,
      status: 'online',
      lastSeen: Date.now(),
      currentRoom: roomId,
    }
  }

  const index = users.findIndex((u) => u.userId === userId)
  if (index >= 0) {
    users[index] = presence
  } else {
    users.push(presence)
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(users), { ex: CACHE_TTL.SHORT })
    },
    undefined,
    `presence:add-room:${roomId}:${userId}`
  )
}

/**
 * Remove user from room
 */
export async function removeUserFromRoom(roomId: string, userId: string): Promise<void> {
  const users = await getOnlineUsersInRoom(roomId)
  const cacheKey = CACHE_KEYS.onlineUsers(roomId)

  const filtered = users.filter((u) => u.userId !== userId)

  if (filtered.length === 0) {
    await executeRedisOperation(
      async (redis) => {
        await redis.del(cacheKey)
      },
      undefined,
      `presence:remove-room:${roomId}:${userId}`
    )
  } else {
    await executeRedisOperation(
      async (redis) => {
        await redis.set(cacheKey, JSON.stringify(filtered), { ex: CACHE_TTL.SHORT })
      },
      undefined,
      `presence:remove-room:${roomId}:${userId}`
    )
  }
}

/**
 * Get total online users count
 */
export async function getTotalOnlineUsers(): Promise<number> {
  const redis = getRedis()

  if (!redis) return 0

  try {
    let cursor = '0'
    let count = 0

    do {
      const scanResult = await redis.scan(parseInt(cursor), {
        match: 'presence:*',
        count: 100,
      })

      cursor = scanResult[0]
      const keys = (scanResult[1] as string[]) || []
      count += keys.length
    } while (cursor !== '0')

    return count
  } catch (err) {
    console.error('[Presence] Failed to count online users:', err)
    return 0
  }
}
