/**
 * Session Type Definitions
 *
 * Interface definitions for session management
 */

/**
 * Core session data
 */
export interface Session {
  id: string
  userId: string
  userEmail?: string
  userName?: string
  createdAt: number
  expiresAt: number
  lastActivity: number
  ipAddress?: string
  userAgent?: string
}

/**
 * Session metadata (extended session data)
 */
export interface SessionMetadata {
  isAuthenticated: boolean
  roles?: string[]
  permissions?: string[]
  theme?: 'light' | 'dark'
  language?: string
  notifications?: boolean
  twoFactorEnabled?: boolean
  [key: string]: any
}

/**
 * Combined session with metadata
 */
export interface SessionWithMetadata extends Session {
  metadata?: SessionMetadata
}

/**
 * Session options for creation
 */
export interface SessionOptions {
  ttlSeconds?: number
  ipAddress?: string
  userAgent?: string
  metadata?: SessionMetadata
}

/**
 * Session creation/update payload
 */
export interface CreateSessionPayload {
  userId: string
  userEmail?: string
  userName?: string
  ttlSeconds?: number
  ipAddress?: string
  userAgent?: string
  metadata?: SessionMetadata
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean
  session?: Session
  error?: string
}
