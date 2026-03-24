/**
 * Centralized Redis & Cache Module Exports
 * 
 * Import all Redis features from a single location:
 * 
 * import {
 *   checkRateLimit,
 *   getFromCache,
 *   createSession,
 *   recordAPIMetric,
 *   setUserOnline,
 * } from '@/lib'
 */

// ────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ────────────────────────────────────────────────────────────────────────────
export { checkRateLimit } from './rateLimit'

// ────────────────────────────────────────────────────────────────────────────
// Cache Module
// ────────────────────────────────────────────────────────────────────────────
export {
  // Core
  getRedis,
  isRedisAvailable,
  resetRedis,
  executeRedisOperation,
} from './cache/redis-client'

export {
  // Keys & TTLs
  CACHE_KEYS,
  CACHE_TTL,
  DATA_TTL_MAP,
  getTTLForKey,
  getCachePattern,
  INVALIDATION_PATTERNS,
} from './cache/cache-keys'

export {
  // Operations
  getFromCache,
  setInCache,
  deleteFromCache,
  deleteManyFromCache,
  cacheKeyExists,
  getCacheTTL,
  incrementCounter,
  getOrSetCache,
  invalidatePattern,
  mgetFromCache,
  msetInCache,
  pushToList,
  getListRange,
  addToSet,
  getSetMembers,
  getCacheStats,
} from './cache/strategies'

export {
  // Invalidation
  invalidateUserCache,
  invalidateTaskCache,
  invalidateTaskLists,
  invalidateSearchCache,
  invalidateCategoryCache,
  invalidateBidCache,
  invalidateUserNotifications,
  invalidatePricingCache,
  invalidateMultiple,
  cascadeInvalidateTask,
  cascadeInvalidateUser,
  clearAllCache,
} from './cache/cache-invalidation'

// ────────────────────────────────────────────────────────────────────────────
// Session Management
// ────────────────────────────────────────────────────────────────────────────
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
} from './sessions/redis-session-store'

export type { Session, SessionMetadata, CreateSessionPayload, SessionValidationResult } from './sessions/types'

// ────────────────────────────────────────────────────────────────────────────
// Job Queue Monitoring
// ────────────────────────────────────────────────────────────────────────────
export {
  trackJobStatus,
  getJobStatus,
  completeJob,
  failJob,
  startProcessingJob,
  getQueueStatistics,
  getRecentFailedJobs,
} from './queue/job-monitoring'

export type { JobStatus, QueueStats } from './queue/job-monitoring'

// ────────────────────────────────────────────────────────────────────────────
// Real-Time Features
// ────────────────────────────────────────────────────────────────────────────

// Presence
export {
  setUserOnline,
  setUserAway,
  setUserOffline,
  getUserPresence,
  getOnlineUsersInRoom,
  addUserToRoom,
  removeUserFromRoom,
  getTotalOnlineUsers,
} from './realtime/presence'

export type { UserPresence } from './realtime/presence'

// Activity Stream
export { logActivity, getActivityStream, clearActivityStream } from './realtime/activity-stream'

export type { ActivityEvent } from './realtime/activity-stream'

// Notifications
export {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  broadcastNotification,
} from './realtime/notifications'

export type { Notification } from './realtime/notifications'

// ────────────────────────────────────────────────────────────────────────────
// Analytics & Metrics
// ────────────────────────────────────────────────────────────────────────────
export {
  recordMetric,
  recordAPIMetric,
  recordCacheMetric,
  recordUserEngagement,
  recordErrorMetric,
  recordSearchMetric,
  recordDatabaseMetric,
  getMetrics,
  getAPIMetricsSummary,
  getCachePerformance,
  getTopEndpoints,
} from './analytics'

export type { Metric, MetricsSnapshot } from './analytics'
