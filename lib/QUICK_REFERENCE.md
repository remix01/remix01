# Upstash Redis Quick Reference

Quick lookup for all Redis functions and their usage.

## Caching Operations

```typescript
import { 
  getFromCache, 
  setInCache, 
  getOrSetCache,
  deleteFromCache,
  invalidatePattern,
  CACHE_KEYS,
  CACHE_TTL
} from '@/lib/cache'

// Get value
const value = await getFromCache<T>(key)

// Set value
await setInCache(key, value, CACHE_TTL.MEDIUM)

// Get or fetch
const data = await getOrSetCache(
  key,
  () => fetchFromDB(),
  CACHE_TTL.MEDIUM
)

// Delete
await deleteFromCache(key)

// Invalidate pattern
await invalidatePattern('user:*')

// Cache keys
CACHE_KEYS.user(userId)
CACHE_KEYS.task(taskId)
CACHE_KEYS.searchResults(query, page)
```

## Rate Limiting

```typescript
import { 
  authLimiter,
  apiLimiter,
  offerLimiter,
  searchLimiter,
  // ... other limiters
} from '@/lib/rate-limit/limiters'
import { getIdentifier } from '@/lib/rate-limit/rate-limiter'

// Check rate limit
const identifier = getIdentifier(request, userId)
const check = await limiter.check(identifier)

if (!check.allowed) {
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'RateLimit-Limit': check.limit,
        'RateLimit-Remaining': check.remaining,
        'RateLimit-Reset': check.resetAt,
      }
    }
  )
}
```

## Session Management

```typescript
import {
  createSession,
  getSession,
  validateSession,
  touchSession,
  deleteSession,
  updateSessionMetadata,
  extendSession,
  deleteUserSessions,
  type Session
} from '@/lib/sessions'

// Create
const session = await createSession({
  userId: 'user_123',
  userEmail: 'user@example.com',
  ipAddress: '192.168.1.1',
  ttlSeconds: 86400,
  metadata: { theme: 'dark' }
})

// Validate
const result = await validateSession(sessionId)
if (result.valid) {
  const session = result.session
}

// Touch (update last activity)
await touchSession(sessionId)

// Update metadata
await updateSessionMetadata(sessionId, { theme: 'light' })

// Extend
await extendSession(sessionId, 86400)

// Delete
await deleteSession(sessionId)

// Logout all devices
await deleteUserSessions(userId)
```

## Real-time Features

### Presence

```typescript
import {
  setUserOnline,
  setUserAway,
  setUserOffline,
  getUserPresence,
  getOnlineUsersInRoom,
  addUserToRoom,
  removeUserFromRoom,
  getTotalOnlineUsers,
  type UserPresence
} from '@/lib/realtime'

// Set online
await setUserOnline(userId, { currentPage: '/tasks' })

// Set away
await setUserAway(userId)

// Set offline
await setUserOffline(userId)

// Get presence
const presence = await getUserPresence(userId)

// Room operations
await addUserToRoom(roomId, userId)
await removeUserFromRoom(roomId, userId)
const onlineInRoom = await getOnlineUsersInRoom(roomId)
```

### Notifications

```typescript
import {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  broadcastNotification,
  type Notification
} from '@/lib/realtime'

// Create
await createNotification({
  userId: 'user_123',
  type: 'success',
  title: 'Offer Accepted',
  message: 'Your offer has been accepted!',
  actionUrl: '/offers/123'
})

// Get
const notifs = await getUserNotifications(userId, 50)
const unread = await getUnreadNotificationCount(userId)

// Update
await markNotificationAsRead(userId, notificationId)
await markAllNotificationsAsRead(userId)

// Delete
await deleteNotification(userId, notificationId)
await clearAllNotifications(userId)

// Broadcast
await broadcastNotification(
  [userId1, userId2, userId3],
  { type: 'info', title: 'Announcement' }
)
```

### Activity Stream

```typescript
import {
  logActivity,
  getActivityStream,
  clearActivityStream,
  type ActivityEvent
} from '@/lib/realtime'

// Log
await logActivity({
  type: 'created',
  entityType: 'task',
  entityId: 'task_123',
  userId: 'user_123',
  message: 'Created new task'
})

// Get
const activities = await getActivityStream('task', 'task_123', 50)

// Clear
await clearActivityStream('task', 'task_123')
```

## Job Queue Monitoring

```typescript
import {
  trackJobStatus,
  getJobStatus,
  completeJob,
  failJob,
  startProcessingJob,
  getQueueStatistics,
  getRecentFailedJobs,
  type JobStatus
} from '@/lib/queue/job-monitoring'

// Track
await trackJobStatus(jobId, 'sendEmail', 'pending', {
  createdAt: Date.now()
})

// Get status
const status = await getJobStatus(jobId)

// Update
await startProcessingJob(jobId)
await completeJob(jobId)
await failJob(jobId, 'Connection timeout')

// Monitor
const stats = await getQueueStatistics()
const failed = await getRecentFailedJobs(100)
```

## Analytics & Metrics

```typescript
import {
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
  getTopEndpoints
} from '@/lib/analytics'

// Record metrics
await recordAPIMetric('/api/tasks', 150, 200, userId)
await recordCacheMetric(true, 'task:list')
await recordUserEngagement(userId, 'offer_created', { amount: 100 })
await recordErrorMetric('TIMEOUT', '/api/search')
await recordSearchMetric('laptops', 42, 150)
await recordDatabaseMetric('create', 'task', 100)

// Query metrics
const metrics = await getMetrics('api:/api/tasks', 7)
const api = await getAPIMetricsSummary('/api/tasks', 7)
const cache = await getCachePerformance(7)
const top = await getTopEndpoints(10, 7)
```

## Cache Keys Reference

```typescript
import { CACHE_KEYS } from '@/lib/cache'

// User
CACHE_KEYS.user(userId)
CACHE_KEYS.userPermissions(userId)
CACHE_KEYS.userPreferences(userId)
CACHE_KEYS.userStats(userId)

// Tasks
CACHE_KEYS.task(taskId)
CACHE_KEYS.taskList(categoryId, page)
CACHE_KEYS.taskStats(taskId)

// Search
CACHE_KEYS.searchResults(query, page)
CACHE_KEYS.search(query, type)

// Categories
CACHE_KEYS.category(categoryId)
CACHE_KEYS.categoryList()

// AI
CACHE_KEYS.aiResponse(messageHash)

// Pricing
CACHE_KEYS.pricing(taskType)

// Session
CACHE_KEYS.session(sessionId)

// Notifications
CACHE_KEYS.userNotifications(userId)
CACHE_KEYS.unreadCount(userId)

// Presence
CACHE_KEYS.userOnline(userId)
CACHE_KEYS.onlineUsers(roomId)

// Activity
CACHE_KEYS.activityStream(entityType, entityId)
```

## TTL Constants

```typescript
import { CACHE_TTL } from '@/lib/cache'

CACHE_TTL.SHORT        // 5 minutes
CACHE_TTL.MEDIUM_SHORT // 15 minutes
CACHE_TTL.MEDIUM       // 1 hour
CACHE_TTL.LONG         // 24 hours
CACHE_TTL.VERY_LONG    // 7 days
```

## Rate Limiters

```typescript
import { RATE_LIMITERS } from '@/lib/rate-limit/limiters'

RATE_LIMITERS.auth         // 15 min, 10 requests
RATE_LIMITERS.inquiry      // 1 hour, 5 requests
RATE_LIMITERS.offer        // 1 hour, 20 requests
RATE_LIMITERS.api          // 1 min, 100 requests
RATE_LIMITERS.upload       // 1 hour, 20 requests
RATE_LIMITERS.search       // 1 min, 60 requests
RATE_LIMITERS.ai           // 1 min, 30 requests
RATE_LIMITERS.payment      // 1 min, 10 requests
RATE_LIMITERS.webhook      // 1 min, 1000 requests
RATE_LIMITERS.bid          // 1 hour, 50 requests
RATE_LIMITERS.email        // 1 hour, 5 requests
```

## Common Patterns

### Pattern: Cached Read
```typescript
const data = await getOrSetCache(
  CACHE_KEYS.task(taskId),
  () => db.tasks.findUnique({ id: taskId }),
  CACHE_TTL.MEDIUM
)
```

### Pattern: Invalidate After Write
```typescript
await db.tasks.update({ id: taskId, ...data })
await invalidateTaskCache(taskId)
```

### Pattern: Rate Limited Endpoint
```typescript
const identifier = getIdentifier(request, userId)
const check = await apiLimiter.check(identifier)
if (!check.allowed) return Response.json({}, { status: 429 })
```

### Pattern: Authenticated Action
```typescript
const result = await validateSession(sessionId)
if (!result.valid) return Response.json({}, { status: 401 })
const userId = result.session.userId
```

### Pattern: Track Engagement
```typescript
await recordUserEngagement(userId, 'offer_created')
await logActivity({ type: 'created', ...metadata })
await createNotification({ userId, type: 'success', ...data })
```

## Debugging

```typescript
// Check if Redis is available
import { isRedisAvailable } from '@/lib/cache'
console.log(isRedisAvailable())

// Get cache stats
import { getCacheStats } from '@/lib/cache'
const stats = await getCacheStats()

// Get session stats
import { getSessionStats } from '@/lib/sessions'
const sessionStats = await getSessionStats()

// Get queue stats
import { getQueueStatistics } from '@/lib/queue/job-monitoring'
const queueStats = await getQueueStatistics()
```

## Error Handling

All Redis operations gracefully degrade:
- If Redis is unavailable, operations return fallback values
- No errors are thrown (checks for null/undefined)
- Rate limiting falls back to in-memory (local dev only)
- Caching returns fresh from DB if Redis fails

Always check for null returns:
```typescript
const cached = await getFromCache(key)
if (cached === null) {
  // Cache miss or Redis unavailable
}
```
