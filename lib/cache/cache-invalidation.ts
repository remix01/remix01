/**
 * Cache Invalidation
 *
 * Event-driven cache invalidation patterns and helpers.
 * Ensures data stays fresh when underlying data changes.
 */

import { deleteFromCache, deleteManyFromCache, invalidatePattern } from './strategies'
import { CACHE_KEYS, INVALIDATION_PATTERNS } from './cache-keys'

/**
 * Invalidate all cache related to a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    deleteFromCache(CACHE_KEYS.user(userId)),
    deleteFromCache(CACHE_KEYS.userPermissions(userId)),
    deleteFromCache(CACHE_KEYS.userPreferences(userId)),
    deleteFromCache(CACHE_KEYS.userStats(userId)),
    invalidatePattern(INVALIDATION_PATTERNS.userAll(userId)),
  ])
}

/**
 * Invalidate all cache related to a task
 */
export async function invalidateTaskCache(taskId: string): Promise<void> {
  await Promise.all([
    deleteFromCache(CACHE_KEYS.task(taskId)),
    deleteFromCache(CACHE_KEYS.taskStats(taskId)),
    deleteFromCache(CACHE_KEYS.taskBids(taskId)),
    // Also clear task lists (they may contain this task)
    invalidatePattern('task:list:*'),
    invalidatePattern('search:*'),
  ])
}

/**
 * Invalidate all task lists (when new task is created, etc)
 */
export async function invalidateTaskLists(): Promise<void> {
  await invalidatePattern('task:list:*')
}

/**
 * Invalidate all search results
 */
export async function invalidateSearchCache(): Promise<void> {
  await invalidatePattern(INVALIDATION_PATTERNS.searchAll())
}

/**
 * Invalidate category cache
 */
export async function invalidateCategoryCache(categoryId?: string): Promise<void> {
  if (categoryId) {
    await deleteFromCache(CACHE_KEYS.category(categoryId))
  } else {
    await deleteFromCache(CACHE_KEYS.categoryList())
  }
}

/**
 * Invalidate bid-related cache
 */
export async function invalidateBidCache(taskId: string, bidId: string): Promise<void> {
  await Promise.all([
    deleteFromCache(CACHE_KEYS.bid(bidId)),
    deleteFromCache(CACHE_KEYS.taskBids(taskId)),
  ])
}

/**
 * Invalidate user notifications
 */
export async function invalidateUserNotifications(userId: string): Promise<void> {
  await Promise.all([
    deleteFromCache(CACHE_KEYS.userNotifications(userId)),
    deleteFromCache(CACHE_KEYS.unreadCount(userId)),
  ])
}

/**
 * Invalidate pricing cache (when rates change)
 */
export async function invalidatePricingCache(): Promise<void> {
  await Promise.all([
    invalidatePattern('pricing:*'),
    // Pricing changes may affect all tasks/bids
    invalidatePattern('task:*'),
  ])
}

/**
 * Batch invalidation helper
 */
export async function invalidateMultiple(...keyPatterns: string[]): Promise<void> {
  const invalidationPromises = keyPatterns.map((pattern) =>
    pattern.includes('*') ? invalidatePattern(pattern) : deleteFromCache(pattern)
  )
  await Promise.all(invalidationPromises)
}

/**
 * Cascade invalidation when a task changes
 * Includes related entities (bids, notifications, search results)
 */
export async function cascadeInvalidateTask(taskId: string, options?: { includeSearch?: boolean }): Promise<void> {
  const promises: Promise<any>[] = [invalidateTaskCache(taskId)]

  if (options?.includeSearch !== false) {
    promises.push(invalidateSearchCache())
  }

  await Promise.all(promises)
}

/**
 * Cascade invalidation when a user changes (profile, permissions, stats)
 */
export async function cascadeInvalidateUser(userId: string): Promise<void> {
  await Promise.all([
    invalidateUserCache(userId),
    // User changes may affect their tasks
    invalidatePattern(`task:*:${userId}*`),
    // User changes may affect notifications
    invalidatePattern(`notifications:*:${userId}*`),
  ])
}

/**
 * Complete cache clear (use with caution!)
 */
export async function clearAllCache(): Promise<void> {
  await invalidatePattern('*')
}
