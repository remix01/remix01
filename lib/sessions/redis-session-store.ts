/**
 * Redis Session Store
 *
 * Express-compatible session store backed by Upstash Redis.
 * Provides secure, scalable session management.
 *
 * Usage:
 *   const store = getRedisSessionStore()
 *   const session = await store.createSession(userId, options)
 *   const validated = await store.validateSession(sessionId)
 */

import crypto from 'crypto'
import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys'
import { Session, SessionMetadata, CreateSessionPayload, SessionValidationResult } from './types'

const DEFAULT_SESSION_TTL = 24 * 60 * 60 // 24 hours

/**
 * Generate a cryptographically secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a new session
 */
export async function createSession(payload: CreateSessionPayload): Promise<Session> {
  const sessionId = generateSessionId()
  const now = Date.now()
  const ttlSeconds = payload.ttlSeconds || DEFAULT_SESSION_TTL

  const session: Session = {
    id: sessionId,
    userId: payload.userId,
    userEmail: payload.userEmail,
    userName: payload.userName,
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
    lastActivity: now,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
  }

  const cacheKey = CACHE_KEYS.session(sessionId)

  // Store session with metadata if provided
  const sessionData = {
    ...session,
    ...(payload.metadata && { metadata: payload.metadata }),
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(sessionData), { ex: ttlSeconds })
    },
    undefined,
    `session:create:${sessionId}`
  )

  return session
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const cacheKey = CACHE_KEYS.session(sessionId)

  return executeRedisOperation(
    async (redis) => {
      const data = await redis.get<string>(cacheKey)
      if (!data) return null

      try {
        const parsed = JSON.parse(data)
        return parsed as Session
      } catch {
        return null
      }
    },
    null,
    `session:get:${sessionId}`
  )
}

/**
 * Validate session (check expiry and return if still valid)
 */
export async function validateSession(sessionId: string): Promise<SessionValidationResult> {
  const session = await getSession(sessionId)

  if (!session) {
    return {
      valid: false,
      error: 'Session not found',
    }
  }

  if (Date.now() > session.expiresAt) {
    // Delete expired session
    await deleteSession(sessionId)
    return {
      valid: false,
      error: 'Session expired',
    }
  }

  return {
    valid: true,
    session,
  }
}

/**
 * Update session last activity timestamp
 */
export async function touchSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId)

  if (!session) return

  const now = Date.now()
  const ttlSeconds = Math.ceil((session.expiresAt - now) / 1000)

  if (ttlSeconds > 0) {
    const cacheKey = CACHE_KEYS.session(sessionId)
    const updated = {
      ...session,
      lastActivity: now,
    }

    await executeRedisOperation(
      async (redis) => {
        await redis.set(cacheKey, JSON.stringify(updated), { ex: ttlSeconds })
      },
      undefined,
      `session:touch:${sessionId}`
    )
  }
}

/**
 * Update session metadata
 */
export async function updateSessionMetadata(sessionId: string, metadata: Partial<SessionMetadata>): Promise<void> {
  const session = await getSession(sessionId)

  if (!session) return

  const now = Date.now()
  const ttlSeconds = Math.ceil((session.expiresAt - now) / 1000)

  if (ttlSeconds > 0) {
    const cacheKey = CACHE_KEYS.session(sessionId)
    const updated = {
      ...session,
      metadata: {
        ...(typeof (session as any).metadata === 'object' ? (session as any).metadata : {}),
        ...metadata,
      },
    }

    await executeRedisOperation(
      async (redis) => {
        await redis.set(cacheKey, JSON.stringify(updated), { ex: ttlSeconds })
      },
      undefined,
      `session:update-metadata:${sessionId}`
    )
  }
}

/**
 * Extend session expiry
 */
export async function extendSession(sessionId: string, additionalSeconds: number = DEFAULT_SESSION_TTL): Promise<void> {
  const session = await getSession(sessionId)

  if (!session) return

  const now = Date.now()
  const newExpiresAt = Math.max(session.expiresAt, now) + additionalSeconds * 1000

  const cacheKey = CACHE_KEYS.session(sessionId)
  const updated = {
    ...session,
    expiresAt: newExpiresAt,
  }

  const ttlSeconds = Math.ceil((newExpiresAt - now) / 1000)

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(updated), { ex: ttlSeconds })
    },
    undefined,
    `session:extend:${sessionId}`
  )
}

/**
 * Delete session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const cacheKey = CACHE_KEYS.session(sessionId)

  await executeRedisOperation(
    async (redis) => {
      await redis.del(cacheKey)
    },
    undefined,
    `session:delete:${sessionId}`
  )
}

/**
 * Delete all sessions for a user (logout all devices)
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await executeRedisOperation(
    async (redis) => {
      // SCAN for all sessions belonging to this user
      let cursor = '0'
      let sessionKeys: string[] = []

      do {
        const scanResult = await redis.scan(parseInt(cursor), {
          match: 'session:*',
          count: 100,
        })

        cursor = scanResult[0]
        const keys = (scanResult[1] as string[]) || []

        // Check each key to see if it belongs to this user
        for (const key of keys) {
          try {
            const data = await redis.get<string>(key)
            if (data) {
              const parsed = JSON.parse(data)
              if (parsed.userId === userId) {
                sessionKeys.push(key)
              }
            }
          } catch {
            // Skip parsing errors
          }
        }
      } while (cursor !== '0')

      // Delete all sessions for this user
      if (sessionKeys.length > 0) {
        await redis.del(...sessionKeys)
      }
    },
    undefined,
    `session:delete-user:${userId}`
  )
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  return executeRedisOperation(
    async (redis) => {
      const sessions: Session[] = []
      let cursor = '0'
      const now = Date.now()

      do {
        const scanResult = await redis.scan(parseInt(cursor), {
          match: 'session:*',
          count: 100,
        })

        cursor = scanResult[0]
        const keys = (scanResult[1] as string[]) || []

        for (const key of keys) {
          try {
            const data = await redis.get<string>(key)
            if (data) {
              const parsed = JSON.parse(data) as Session
              if (parsed.userId === userId && parsed.expiresAt > now) {
                sessions.push(parsed)
              }
            }
          } catch {
            // Skip parsing errors
          }
        }
      } while (cursor !== '0')

      return sessions
    },
    [],
    `session:list-user:${userId}`
  )
}

/**
 * Get session statistics
 */
export async function getSessionStats(): Promise<{
  totalSessions: number
  expiredSessions: number
  activeSessions: number
}> {
  return executeRedisOperation(
    async (redis) => {
      let totalSessions = 0
      let expiredSessions = 0
      const now = Date.now()

      let cursor = '0'

      do {
        const scanResult = await redis.scan(parseInt(cursor), {
          match: 'session:*',
          count: 100,
        })

        cursor = scanResult[0]
        const keys = (scanResult[1] as string[]) || []
        totalSessions += keys.length

        for (const key of keys) {
          try {
            const data = await redis.get<string>(key)
            if (data) {
              const parsed = JSON.parse(data) as Session
              if (parsed.expiresAt <= now) {
                expiredSessions++
              }
            }
          } catch {
            // Skip parsing errors
          }
        }
      } while (cursor !== '0')

      return {
        totalSessions,
        expiredSessions,
        activeSessions: totalSessions - expiredSessions,
      }
    },
    { totalSessions: 0, expiredSessions: 0, activeSessions: 0 },
    `session:stats`
  )
}
