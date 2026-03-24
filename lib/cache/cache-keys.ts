/**
 * Cache Key Patterns
 *
 * Centralized cache key definitions for the entire application.
 * Using namespaced pattern: `namespace:subspace:identifier`
 *
 * Benefits:
 * - Organized and predictable key structure
 * - Easy to find and invalidate related keys
 * - Prevents key collisions
 * - Self-documenting
 */

// ── USERS
export const CACHE_KEYS = {
  // User profile cache
  user: (userId: string) => `user:profile:${userId}`,
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  userPreferences: (userId: string) => `user:preferences:${userId}`,
  userStats: (userId: string) => `user:stats:${userId}`,

  // Auth/Session related
  session: (sessionId: string) => `session:${sessionId}`,
  authToken: (token: string) => `auth:token:${token}`,

  // ── MARKETPLACE DATA
  // Tasks/Jobs
  task: (taskId: string) => `task:${taskId}`,
  taskList: (categoryId: string, page: number = 1) => `task:list:${categoryId}:${page}`,
  taskStats: (taskId: string) => `task:stats:${taskId}`,

  // Categories
  category: (categoryId: string) => `category:${categoryId}`,
  categoryList: () => 'category:list:all',

  // Bids/Offers
  bid: (bidId: string) => `bid:${bidId}`,
  taskBids: (taskId: string) => `task:bids:${taskId}`,

  // ── SEARCH
  search: (query: string, type: string = 'all') => {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, '-')
    return `search:${type}:${normalized}`
  },
  searchResults: (query: string, page: number = 1) => {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, '-')
    return `search:results:${normalized}:${page}`
  },

  // ── AI/ML
  aiResponse: (messageHash: string) => `ai:response:${messageHash}`,
  aiEmbedding: (textHash: string) => `ai:embedding:${textHash}`,

  // ── PRICING & RULES
  pricing: (taskType: string) => `pricing:rules:${taskType}`,
  commissionRate: () => 'pricing:commission:rate',
  escrowRules: () => 'pricing:escrow:rules',

  // ── NOTIFICATIONS
  userNotifications: (userId: string) => `notifications:${userId}`,
  unreadCount: (userId: string) => `notifications:unread:${userId}`,

  // ── ANALYTICS
  analyticsEvents: (event: string, date: string) => `analytics:events:${event}:${date}`,
  apiMetrics: (endpoint: string) => `metrics:api:${endpoint}`,
  cacheStats: () => 'metrics:cache:stats',

  // ── JOB QUEUE
  jobStatus: (jobId: string) => `queue:job:${jobId}`,
  queueStats: () => 'queue:stats',

  // ── RATE LIMITING
  rateLimit: (name: string, identifier: string) => `rl:${name}:${identifier}`,
  rateLimitStats: (name: string) => `rl:stats:${name}`,

  // ── PRESENCE & ACTIVITY
  userOnline: (userId: string) => `presence:${userId}`,
  onlineUsers: (roomId: string) => `presence:room:${roomId}`,
  activityStream: (entityType: string, entityId: string) => `activity:${entityType}:${entityId}`,

  // ── FEATURE FLAGS
  featureFlag: (flagName: string) => `feature:${flagName}`,
  featureFlagUser: (flagName: string, userId: string) => `feature:${flagName}:user:${userId}`,
}

// ── CACHE TTL STRATEGIES
export const CACHE_TTL = {
  // Ultra-short: 5 minutes - for hot data that changes frequently
  SHORT: 5 * 60,

  // Short: 15 minutes - for user-specific or frequently-changing data
  MEDIUM_SHORT: 15 * 60,

  // Medium: 1 hour - for data that changes occasionally
  MEDIUM: 60 * 60,

  // Long: 24 hours - for relatively static data
  LONG: 24 * 60 * 60,

  // Very long: 7 days - for reference data
  VERY_LONG: 7 * 24 * 60 * 60,

  // Permanent: No expiration (set via other means)
  PERMANENT: null,
}

// ── RECOMMENDED TTL BY DATA TYPE
export const DATA_TTL_MAP: Record<string, number> = {
  // Fast-changing data: 5 min
  'task-list': CACHE_TTL.SHORT,
  'search-results': CACHE_TTL.SHORT,
  'user-stats': CACHE_TTL.SHORT,

  // Moderately-changing data: 15 min
  'user-profile': CACHE_TTL.MEDIUM_SHORT,
  'user-permissions': CACHE_TTL.MEDIUM_SHORT,
  'category': CACHE_TTL.MEDIUM_SHORT,

  // Slowly-changing data: 1 hour
  'pricing-rules': CACHE_TTL.MEDIUM,
  'commission-rates': CACHE_TTL.MEDIUM,

  // Static reference data: 24 hours
  'ai-responses': CACHE_TTL.LONG,
  'embeddings': CACHE_TTL.LONG,

  // Session data: 24 hours
  'session': CACHE_TTL.LONG,
}

/**
 * Get recommended TTL for a cache key prefix
 */
export function getTTLForKey(keyPrefix: string): number {
  return DATA_TTL_MAP[keyPrefix] || CACHE_TTL.MEDIUM
}

/**
 * Create a cache key pattern for prefix matching (for invalidation)
 * Used with Redis SCAN commands
 *
 * Example: getCachePattern('user:profile:*') for all user profiles
 */
export function getCachePattern(pattern: string): string {
  return pattern
}

/**
 * Common cache invalidation patterns
 */
export const INVALIDATION_PATTERNS = {
  userAll: (userId: string) => `user:*:${userId}`,
  taskAll: (taskId: string) => `task:*:${taskId}`,
  categoryAll: (categoryId: string) => `category:*:${categoryId}`,
  searchAll: () => `search:*`,
  analyticsAll: () => `analytics:*`,
  notificationsUser: (userId: string) => `notifications:${userId}*`,
}
