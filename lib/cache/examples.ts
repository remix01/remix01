/**
 * Cache Usage Examples
 *
 * Real-world examples of how to use the caching system
 */

import {
  CACHE_KEYS,
  CACHE_TTL,
  getFromCache,
  setInCache,
  getOrSetCache,
  invalidateTaskCache,
  invalidateUserCache,
  incrementCounter,
  pushToList,
  getListRange,
} from './index'

// ── EXAMPLE 1: CACHE USER PROFILE
export async function getUserProfileCached(userId: string) {
  const cacheKey = CACHE_KEYS.user(userId)

  return getOrSetCache(
    cacheKey,
    async () => {
      // This would be replaced with actual database query
      // const user = await db.query.users.findUnique({ where: { id: userId } })
      // return user
      throw new Error('Implement database query')
    },
    CACHE_TTL.MEDIUM_SHORT // 15 minutes
  )
}

// ── EXAMPLE 2: CACHE TASK LIST WITH PAGINATION
export async function getTaskListCached(categoryId: string, page: number = 1) {
  const cacheKey = CACHE_KEYS.taskList(categoryId, page)

  return getOrSetCache(
    cacheKey,
    async () => {
      // Replace with actual database query
      // const tasks = await db.query.tasks.findMany({
      //   where: { categoryId },
      //   skip: (page - 1) * 20,
      //   take: 20,
      // })
      // return tasks
      throw new Error('Implement database query')
    },
    CACHE_TTL.SHORT // 5 minutes
  )
}

// ── EXAMPLE 3: CACHE WITH MANUAL INVALIDATION
export async function updateUserProfile(userId: string, data: any) {
  // Update in database
  // const updated = await db.query.users.update({
  //   where: { id: userId },
  //   data,
  // })

  // Invalidate related cache
  await invalidateUserCache(userId)

  // return updated
}

// ── EXAMPLE 4: COUNT EVENTS (API calls, tasks created, etc)
export async function trackAPICall(endpoint: string) {
  const key = `metrics:api:${endpoint}:${new Date().toISOString().split('T')[0]}`

  // Increment counter with 24-hour TTL
  return incrementCounter(key, 1, CACHE_TTL.LONG)
}

// ── EXAMPLE 5: ACTIVITY STREAM
export async function addActivityLog(taskId: string, activity: { type: string; userId: string; timestamp: number }) {
  const key = CACHE_KEYS.activityStream('task', taskId)

  // Keep only last 100 activities
  return pushToList(key, activity, 100)
}

export async function getActivityLog(taskId: string, limit: number = 50) {
  const key = CACHE_KEYS.activityStream('task', taskId)
  return getListRange(key, 0, limit - 1)
}

// ── EXAMPLE 6: SEARCH RESULTS CACHING
export async function getCachedSearchResults(query: string, page: number = 1) {
  const cacheKey = CACHE_KEYS.searchResults(query, page)

  return getOrSetCache(
    cacheKey,
    async () => {
      // Replace with actual search implementation
      // const results = await performSearch(query, page)
      // return results
      throw new Error('Implement search query')
    },
    CACHE_TTL.SHORT // 5 minutes - search results change frequently
  )
}

// ── EXAMPLE 7: PRICING RULES CACHING
export async function getPricingRulesCached(taskType: string) {
  const cacheKey = CACHE_KEYS.pricing(taskType)

  return getOrSetCache(
    cacheKey,
    async () => {
      // Replace with actual database query
      // const rules = await db.query.pricingRules.findUnique({
      //   where: { taskType }
      // })
      // return rules
      throw new Error('Implement database query')
    },
    CACHE_TTL.MEDIUM // 1 hour - pricing doesn't change often
  )
}

// ── EXAMPLE 8: USER PERMISSIONS CACHING
export async function getUserPermissionsCached(userId: string) {
  const cacheKey = CACHE_KEYS.userPermissions(userId)

  return getOrSetCache(
    cacheKey,
    async () => {
      // Replace with actual database query
      // const permissions = await db.query.permissions.findMany({
      //   where: { userId }
      // })
      // return permissions
      throw new Error('Implement database query')
    },
    CACHE_TTL.MEDIUM_SHORT // 15 minutes - permissions may change
  )
}

// ── EXAMPLE 9: AI RESPONSE CACHING (Already implemented, shown for reference)
import crypto from 'crypto'

function hashMessage(message: string): string {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16)
}

export async function getCachedAIResponse(message: string) {
  const hash = hashMessage(message)
  const cacheKey = CACHE_KEYS.aiResponse(hash)

  return getFromCache<string>(cacheKey)
}

export async function setCachedAIResponse(message: string, response: string) {
  const hash = hashMessage(message)
  const cacheKey = CACHE_KEYS.aiResponse(hash)

  return setInCache(cacheKey, response, CACHE_TTL.LONG) // 24 hours
}

// ── EXAMPLE 10: INVALIDATION ON TASK UPDATE
export async function updateTask(taskId: string, data: any) {
  // Update in database
  // const updated = await db.query.tasks.update({
  //   where: { id: taskId },
  //   data,
  // })

  // Cascade invalidation
  await invalidateTaskCache(taskId)

  // This will clear:
  // - task:${taskId}
  // - task:stats:${taskId}
  // - task:bids:${taskId}
  // - All task:list:* entries
  // - All search:* entries

  // return updated
}

/**
 * INTEGRATION CHECKLIST:
 *
 * 1. Replace `throw new Error()` with actual database queries
 * 2. Import these examples in your API routes/server actions
 * 3. Call cache functions before returning to clients
 * 4. Call invalidation functions after database updates
 * 5. Monitor cache hit rates via metrics (next section)
 * 6. Use CACHE_TTL constants for consistent TTL values
 * 7. Test with Redis unavailable (graceful degradation)
 *
 * COMMON PATTERNS:
 *
 * - GET: Use getOrSetCache() for automatic cache-aside
 * - UPDATE: Call invalidation after database update
 * - DELETE: Call invalidation for the deleted item
 * - BULK: Use mgetFromCache() and msetInCache()
 * - EVENTS: Use incrementCounter() for metrics
 * - STREAMS: Use pushToList() for activity logs
 */
