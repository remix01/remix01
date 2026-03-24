/**
 * Session Management Module
 *
 * Main entry point for session management functionality
 */

export type { Session, SessionMetadata, SessionWithMetadata, SessionOptions, CreateSessionPayload, SessionValidationResult } from './types'

export {
  createSession,
  getSession,
  validateSession,
  touchSession,
  updateSessionMetadata,
  extendSession,
  deleteSession,
  deleteUserSessions,
  getUserSessions,
  getSessionStats,
} from './redis-session-store'
