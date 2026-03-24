/**
 * Upstash Redis Implementation Complete
 * 
 * COMPREHENSIVE INTEGRATION GUIDE
 * 
 * This file documents all Redis features implemented and how to use them.
 */

// ============================================================================
// 1. RATE LIMITING - Protect Your APIs
// ============================================================================

import { checkRateLimit } from '@/lib/rateLimit'

// Example: Rate limit an API endpoint
async function exampleRateLimiting(userId: string, clientIp: string) {
  // Basic usage - 10 requests per minute per user
  const result = await checkRateLimit(`user:${userId}`, 10, 60_000)
  
  if (!result.allowed) {
    const headers: Record<string, string> = {}
    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString()
    }
    return new Response('Too many requests', { 
      status: 429,
      headers
    })
  }
  
  // IP-based rate limiting for unauthenticated requests
  const ipLimit = await checkRateLimit(`ip:${clientIp}`, 100, 3600_000) // 100/hour
}

// ============================================================================
// 2. CACHING - Improve Performance
// ============================================================================

import { 
  getFromCache, 
  setInCache, 
  getOrSetCache,
  CACHE_KEYS,
  CACHE_TTL,
  invalidatePattern,
  cascadeInvalidateTask,
  cascadeInvalidateUser
} from '@/lib/cache'

// Example: Cache user profile
async function exampleCaching(userId: string) {
  // Get or set - Automatic caching
  const userProfile = await getOrSetCache(
    CACHE_KEYS.user(userId),
    async () => {
      // This function is called only if cache miss
      // Replace with your actual database call
      return Promise.resolve({ id: userId, name: 'John Doe', email: 'john@example.com' })
    },
    CACHE_TTL.MEDIUM_SHORT // 15 minutes
  )
  
  // Manual cache operations
  await setInCache(
    CACHE_KEYS.taskList('frontend', 1),
    [],
    CACHE_TTL.SHORT // 5 minutes
  )
  
  const cachedTasks = await getFromCache(CACHE_KEYS.taskList('frontend', 1))
  
  // Invalidate on data changes
  await cascadeInvalidateTask('task-123') // Invalidates task and related data
  await cascadeInvalidateUser(userId) // Invalidates user and related data
}

// ============================================================================
// 3. SESSION MANAGEMENT - Secure User Sessions
// ============================================================================

import {
  createSession,
  getSession,
  touchSession,
  deleteSession,
  extendSession,
  deleteUserSessions,
  getUserSessions
} from '@/lib/sessions/redis-session-store'
import type { Session, CreateSessionPayload } from '@/lib/sessions/types'

// Example: Session management in authentication
async function exampleSessions(user: { id: string; email: string; name: string }, request: { ip?: string; headers: Record<string, string> }) {
  // Create session on login
  const session = await createSession({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    ipAddress: request.ip || 'unknown',
    userAgent: request.headers['user-agent'] || 'unknown',
    metadata: {
      isAuthenticated: true,
      loginMethod: 'email',
      deviceType: 'web'
    }
  })
  
  // Validate session
  const validation = await getSession(session.id)
  if (!validation) {
    // Session expired or invalid
  }
  
  // Update session on activity
  await touchSession(session.id)
  
  // Extend session for "remember me"
  await extendSession(session.id, 7 * 24 * 60 * 60) // 7 days
  
  // Logout - destroy session
  await deleteSession(session.id)
  
  // Logout from all devices
  await deleteUserSessions(user.id)
  
  // Get all active sessions for user
  const allSessions = await getUserSessions(user.id)
}

// ============================================================================
// 4. JOB QUEUE - Background Processing
// ============================================================================

import {
  trackJobStatus,
  getJobStatus,
  completeJob,
  failJob,
  startProcessingJob,
  getQueueStatistics,
  getRecentFailedJobs
} from '@/lib/queue/job-monitoring'

// Example: Track background jobs
async function exampleJobQueue(jobId: string) {
  // When job is created
  await trackJobStatus(jobId, 'sendEmail', 'pending', {
    createdAt: Date.now(),
    maxRetries: 3
  })
  
  // When processing starts
  await startProcessingJob(jobId)
  
  // On completion
  await completeJob(jobId)
  
  // On failure
  await failJob(jobId, 'SMTP connection failed')
  
  // Get statistics
  const stats = await getQueueStatistics()
  console.log(`Pending: ${stats.pending}, Failed: ${stats.failed}`)
  
  // Monitor failures
  const failed = await getRecentFailedJobs(10)
}

// ============================================================================
// 5. REAL-TIME FEATURES - Live Updates
// ============================================================================

// 5a. Presence Tracking - Who's Online
import {
  setUserOnline,
  setUserAway,
  setUserOffline,
  getUserPresence,
  getOnlineUsersInRoom,
  addUserToRoom,
  removeUserFromRoom,
  getTotalOnlineUsers
} from '@/lib/realtime/presence'

async function examplePresence(userId: string) {
  // When user logs in
  await setUserOnline(userId, {
    currentPage: '/tasks',
    currentRoom: 'task-123'
  })
  
  // When user goes away
  await setUserAway(userId)
  
  // When user logs out
  await setUserOffline(userId)
  
  // Get who's online
  const presence = await getUserPresence(userId)
  
  // Room-based presence for collaborative features
  await addUserToRoom('task-123', userId)
  const onlineInRoom = await getOnlineUsersInRoom('task-123')
  
  // Get total online users
  const totalOnline = await getTotalOnlineUsers()
}

// 5b. Activity Stream - User Activity Log
import {
  logActivity,
  getActivityStream,
  clearActivityStream
} from '@/lib/realtime/activity-stream'
import type { ActivityEvent } from '@/lib/realtime/activity-stream'

async function exampleActivityStream(userId: string) {
  // Log user activities
  await logActivity('task-123', {
    type: 'task_created',
    userId: userId,
    userName: 'John',
    description: 'Created task "Build homepage"',
    timestamp: Date.now()
  })
  
  // Get activity feed for task
  const activities = await getActivityStream('task', 'task-123', 50)
  
  // Clear old activities
  await clearActivityStream('task', 'task-123')
}

// 5c. Notifications - Real-Time Alerts
import {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  broadcastNotification
} from '@/lib/realtime/notifications'

async function exampleNotifications(recipientId: string, userId: string, notificationId: string) {
  // Create notification
  await createNotification({
    userId: recipientId,
    type: 'bid_placed',
    title: 'New bid on your task',
    message: 'Someone placed a bid on your task',
    link: '/tasks/123',
    icon: 'badge'
  })
  
  // Get user's notifications
  const notifications = await getUserNotifications(userId)
  
  // Check unread count
  const unreadCount = await getUnreadNotificationCount(userId)
  
  // Mark as read
  await markNotificationAsRead(notificationId)
  
  // Mark all as read
  await markAllNotificationsAsRead(userId)
  
  // Broadcast to multiple users
  await broadcastNotification(
    ['user-1', 'user-2', 'user-3'],
    {
      type: 'system_alert',
      title: 'Maintenance alert',
      message: 'Server maintenance in 1 hour'
    }
  )
}

// ============================================================================
// 6. ANALYTICS & METRICS - Track Performance
// ============================================================================

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

// Example: Record metrics throughout your app
async function exampleAnalytics(userId: string) {
  // Record API metrics
  const startTime = Date.now()
  const response = await fetch('/api/users')
  const duration = Date.now() - startTime
  await recordAPIMetric('/api/users', duration, response.status, userId)
  
  // Record cache metrics
  const cached = await getFromCache(key)
  await recordCacheMetric(cached !== null, key)
  
  // Record user engagement
  await recordUserEngagement(userId, 'task_created', {
    taskCategory: 'frontend',
    estimatedPrice: 500
  })
  
  // Record errors
  await recordErrorMetric('database_connection', '/api/tasks', userId)
  
  // Record search metrics
  await recordSearchMetric('react components', 42, 125)
  
  // Record database operations
  await recordDatabaseMetric('create', 'task', 245) // 245ms
  
  // Retrieve metrics
  const apiMetrics = await getAPIMetricsSummary('/api/tasks', 7)
  console.log(`API success rate: ${apiMetrics.successRate}%`)
  
  const cachePerf = await getCachePerformance(7)
  console.log(`Cache hit rate: ${cachePerf.hitRate}%`)
  
  const topEndpoints = await getTopEndpoints(5)
}

// ============================================================================
// INTEGRATION EXAMPLES - Real-world usage
// ============================================================================

// Example 1: Secure API Endpoint with Rate Limiting
export async function POST_createTask(request: Request) {
  const userId = 'user-123' // await getUserIdFromSession(request)
  
  // Rate limit: 10 tasks per hour per user
  const rateLimit = await checkRateLimit(`createTask:${userId}`, 10, 3600_000)
  if (!rateLimit.allowed) {
    return new Response('Rate limited', { status: 429 })
  }
  
  const data = await request.json()
  // const task = await db.task.create({ data: { ...data, createdBy: userId } })
  const task = { id: 'task-1', ...data, createdBy: userId }
  
  // Record metric
  await recordUserEngagement(userId, 'task_created')
  
  // Invalidate cache
  await cascadeInvalidateTask(task.id)
  
  return Response.json(task)
}

// Example 2: Dashboard with Real-time Updates
export async function GET_dashboard(request: Request) {
  const userId = 'user-123' // await getUserIdFromSession(request)
  
  // Get all data with caching
  const [profile, tasks, stats] = await Promise.all([
    getOrSetCache(CACHE_KEYS.user(userId), () => Promise.resolve({ id: userId, name: 'John' }), CACHE_TTL.MEDIUM),
    getOrSetCache(CACHE_KEYS.taskList(userId, 1), () => Promise.resolve([]), CACHE_TTL.SHORT),
    getOrSetCache(CACHE_KEYS.userStats(userId), () => Promise.resolve({}), CACHE_TTL.MEDIUM_SHORT)
  ])
  
  // Get real-time data
  const onlineUsers = await getTotalOnlineUsers()
  const unreadNotifications = await getUnreadNotificationCount(userId)
  const recentActivities = await getActivityStream('user', userId, 10)
  
  // Track engagement
  await recordUserEngagement(userId, 'dashboard_view')
  
  return Response.json({
    profile,
    tasks,
    stats,
    realtime: {
      onlineUsers,
      unreadNotifications,
      recentActivities
    }
  })
}

// ============================================================================
// BEST PRACTICES & TIPS
// ============================================================================

/*
1. RATE LIMITING:
   - Use user IDs for authenticated users
   - Use IP addresses for unauthenticated users
   - Different limits for different operations
   - Provide meaningful retry-after headers

2. CACHING:
   - Cache expensive database queries
   - Cache frequently accessed data
   - Use appropriate TTLs for different data types
   - Invalidate on updates using cascade functions
   - Monitor cache hit rates

3. SESSIONS:
   - Always set appropriate TTL
   - Use metadata for tracking device/login method
   - Implement "remember me" with extended TTL
   - Provide logout from all devices

4. JOB QUEUE:
   - Track all background jobs for monitoring
   - Monitor failed jobs and retry rates
   - Set reasonable max retries
   - Log errors for debugging

5. REAL-TIME:
   - Update presence on page navigation
   - Notify users of important events
   - Keep activity streams for audit trails
   - Clean up old notifications regularly

6. ANALYTICS:
   - Record all important business events
   - Monitor API response times
   - Track cache performance
   - Identify bottlenecks with metrics
*/

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

/*
Required environment variables (should be pre-configured):
- KV_REST_API_URL
- KV_REST_API_TOKEN
- UPSTASH_REDIS_REST_URL (fallback)
- UPSTASH_REDIS_REST_TOKEN (fallback)

All are automatically set when Upstash integration is connected.
*/

export default {}
