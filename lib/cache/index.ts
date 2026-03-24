/**
 * Cache Module Exports
 *
 * Main entry point for Redis caching functionality
 */

// Core
export { getRedis, isRedisAvailable, resetRedis, executeRedisOperation } from './redis-client'

// Keys & TTLs
export { CACHE_KEYS, CACHE_TTL, DATA_TTL_MAP, getTTLForKey, getCachePattern, INVALIDATION_PATTERNS } from './cache-keys'

// Operations
export {
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
} from './strategies'

// Invalidation
export {
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
} from './cache-invalidation'
