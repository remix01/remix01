/**
 * Upstash Redis Integration Examples
 *
 * Real-world examples showing how to integrate all Redis features in API routes
 * Copy and adapt these patterns to your own API handlers
 */

// ── EXAMPLE 1: API ENDPOINT WITH RATE LIMITING
/**
 * GET /api/tasks
 * - Rate limited: 60 requests per minute
 * - Cached: 5 minutes
 * - Metrics tracked: request count, response time, cache hit/miss
 */
export async function exampleGetTasks() {
  // This is pseudocode showing the integration pattern
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { searchLimiter } from '@/lib/rate-limit/limiters'
  import { getIdentifier } from '@/lib/rate-limit/rate-limiter'
  import { getOrSetCache, recordCacheMetric } from '@/lib/cache'
  import { recordAPIMetric } from '@/lib/analytics'
  import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

  export async function GET(req: NextRequest) {
    const startTime = Date.now()
    const userId = req.headers.get('x-user-id')
    const identifier = getIdentifier(req, userId)

    // 1. Rate limiting check
    const rateLimitCheck = await searchLimiter.check(identifier)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'RateLimit-Limit': rateLimitCheck.limit.toString(),
            'RateLimit-Remaining': rateLimitCheck.remaining.toString(),
            'RateLimit-Reset': new Date(rateLimitCheck.resetAt).toISOString(),
          },
        }
      )
    }

    // 2. Try cache first
    const cacheKey = CACHE_KEYS.taskList('all', 1)
    const cached = await getOrSetCache(
      cacheKey,
      async () => {
        // This would be your database query
        // const tasks = await db.query.tasks.findMany()
        // return tasks
        recordCacheMetric(false, cacheKey) // Cache miss
        throw new Error('Implement database query')
      },
      CACHE_TTL.SHORT
    )

    recordCacheMetric(true, cacheKey) // Cache hit

    // 3. Track metrics
    const responseTime = Date.now() - startTime
    recordAPIMetric('/api/tasks', responseTime, 200, userId)

    return NextResponse.json({ tasks: cached })
  }
  */
}

// ── EXAMPLE 2: AUTHENTICATED ENDPOINT WITH SESSION MANAGEMENT
/**
 * POST /api/offers
 * - Session validation required
 * - Rate limited per user: 20 requests per hour
 * - Activity logged
 * - User engagement tracked
 */
export async function exampleCreateOffer() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { validateSession, touchSession } from '@/lib/sessions'
  import { offerLimiter } from '@/lib/rate-limit/limiters'
  import { getIdentifier } from '@/lib/rate-limit/rate-limiter'
  import { logActivity } from '@/lib/realtime'
  import { recordUserEngagement } from '@/lib/analytics'

  export async function POST(req: NextRequest) {
    const sessionId = req.headers.get('x-session-id')
    const body = await req.json()

    // 1. Validate session
    const sessionResult = await validateSession(sessionId)
    if (!sessionResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session } = sessionResult
    const userId = session.userId

    // 2. Touch session (update last activity)
    await touchSession(sessionId)

    // 3. Rate limiting
    const identifier = `user:${userId}`
    const rateLimitCheck = await offerLimiter.check(identifier)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'You can only create 20 offers per hour' },
        { status: 429 }
      )
    }

    try {
      // 4. Create offer (database operation)
      // const offer = await db.offers.create({ ...body, userId })

      // 5. Log activity
      await logActivity({
        type: 'created',
        entityType: 'offer',
        entityId: 'offer_123', // Replace with actual offer ID
        userId,
        userName: session.userName,
        message: 'Created a new offer',
      })

      // 6. Track engagement
      await recordUserEngagement(userId, 'offer_created', {
        amount: body.amount,
        taskId: body.taskId,
      })

      return NextResponse.json({ offer: { id: 'offer_123' } }, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
    }
  }
  */
}

// ── EXAMPLE 3: SEARCH ENDPOINT WITH CACHING AND METRICS
/**
 * GET /api/search?q=...&page=...
 * - Cache search results for 5 minutes
 * - Track search metrics (queries, response time, result count)
 * - Record no-results events
 */
export async function exampleSearch() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { getOrSetCache } from '@/lib/cache'
  import { recordSearchMetric, recordAPIMetric } from '@/lib/analytics'
  import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

  export async function GET(req: NextRequest) {
    const startTime = Date.now()
    const query = req.nextUrl.searchParams.get('q') || ''
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)

    const cacheKey = CACHE_KEYS.searchResults(query, page)

    try {
      const results = await getOrSetCache(
        cacheKey,
        async () => {
          // This would be your search implementation
          // const results = await performSearch(query, page)
          // return results
          throw new Error('Implement search query')
        },
        CACHE_TTL.SHORT
      )

      const responseTime = Date.now() - startTime

      // Track search metrics
      await recordSearchMetric(query, results.length, responseTime)
      await recordAPIMetric('/api/search', responseTime, 200)

      return NextResponse.json({
        query,
        results,
        count: results.length,
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      await recordAPIMetric('/api/search', responseTime, 500)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
  }
  */
}

// ── EXAMPLE 4: WEBHOOK WITH QUEUE MONITORING
/**
 * POST /api/jobs/process
 * - Track job status through lifecycle
 * - Update queue statistics
 * - Handle retries
 */
export async function exampleJobProcessor() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { trackJobStatus, completeJob, failJob } from '@/lib/queue/job-monitoring'
  import type { JobType } from '@/lib/jobs'

  export async function POST(req: NextRequest) {
    const { jobType, payload, enqueuedAt } = await req.json()

    const jobId = req.headers.get('ce-id') || `job-${Date.now()}`

    try {
      // 1. Mark as processing
      await trackJobStatus(jobId, jobType as JobType, 'processing', {
        startedAt: Date.now(),
      })

      // 2. Process based on job type
      switch (jobType) {
        case 'sendEmail':
          // await sendEmail(payload)
          break
        case 'webhook':
          // await deliverWebhook(payload)
          break
        default:
          throw new Error(`Unknown job type: ${jobType}`)
      }

      // 3. Mark as completed
      await completeJob(jobId)

      return NextResponse.json({ success: true })
    } catch (error) {
      // 4. Mark as failed
      await failJob(jobId, (error as Error).message)
      return NextResponse.json({ error: 'Job failed' }, { status: 500 })
    }
  }
  */
}

// ── EXAMPLE 5: USER ACTIVITY TRACKING
/**
 * POST /api/users/activity
 * - Update user presence
 * - Log user activity
 * - Track engagement
 */
export async function exampleUserActivity() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { setUserOnline, setUserAway } from '@/lib/realtime/presence'
  import { logActivity } from '@/lib/realtime'
  import { recordUserEngagement } from '@/lib/analytics'

  export async function POST(req: NextRequest) {
    const { userId, status, action } = await req.json()

    try {
      // 1. Update presence
      if (status === 'online') {
        await setUserOnline(userId, {
          currentPage: req.headers.get('x-current-page') || undefined,
        })
      } else if (status === 'away') {
        await setUserAway(userId)
      }

      // 2. Log activity
      if (action) {
        await logActivity({
          type: 'custom',
          entityType: 'user',
          entityId: userId,
          userId,
          message: action,
        })
      }

      // 3. Track engagement
      await recordUserEngagement(userId, action || 'page_view')

      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
    }
  }
  */
}

// ── EXAMPLE 6: NOTIFICATIONS ENDPOINT
/**
 * GET /api/notifications
 * - Get user notifications (cached)
 * - Return unread count
 * - Includes rate limiting
 */
export async function exampleNotifications() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { getUserNotifications, getUnreadNotificationCount } from '@/lib/realtime'
  import { validateSession } from '@/lib/sessions'
  import { searchLimiter } from '@/lib/rate-limit/limiters'
  import { getIdentifier } from '@/lib/rate-limit/rate-limiter'

  export async function GET(req: NextRequest) {
    const sessionId = req.headers.get('x-session-id')

    // 1. Validate session
    const sessionResult = await validateSession(sessionId)
    if (!sessionResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = sessionResult.session?.userId

    // 2. Rate limit
    const rateLimitCheck = await searchLimiter.check(`user:${userId}`)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // 3. Get notifications and unread count
    const notifications = await getUserNotifications(userId, 50)
    const unreadCount = await getUnreadNotificationCount(userId)

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  }
  */
}

// ── EXAMPLE 7: DASHBOARD ANALYTICS
/**
 * GET /api/admin/analytics
 * - Get cache performance metrics
 * - Get top endpoints
 * - Get API metrics summary
 * Admin only endpoint
 */
export async function exampleAnalyticsDashboard() {
  /*
  import { NextRequest, NextResponse } from 'next/server'
  import { getCachePerformance, getTopEndpoints, getAPIMetricsSummary } from '@/lib/analytics'

  export async function GET(req: NextRequest) {
    const isAdmin = req.headers.get('x-is-admin') === 'true'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const [cachePerf, topEndpoints, apiMetrics] = await Promise.all([
        getCachePerformance(7),
        getTopEndpoints(10, 7),
        getAPIMetricsSummary('/api/tasks', 7),
      ])

      return NextResponse.json({
        cache: cachePerf,
        topEndpoints,
        apiMetrics,
      })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
  }
  */
}

/**
 * INTEGRATION CHECKLIST
 *
 * Copy these patterns into your API routes:
 *
 * [ ] Rate limiting check at start of handler
 * [ ] Session validation for protected routes
 * [ ] Cache get/set for read operations
 * [ ] Activity logging for user actions
 * [ ] Engagement tracking for analytics
 * [ ] Job status tracking for async operations
 * [ ] Presence updates for real-time features
 * [ ] Metrics recording for all operations
 * [ ] Error handling with proper status codes
 * [ ] HTTP headers for rate limit info (429 responses)
 *
 * ENVIRONMENT VARIABLES NEEDED
 *
 * [ ] KV_REST_API_URL - Upstash Redis URL
 * [ ] KV_REST_API_TOKEN - Upstash Redis token
 * [ ] NEXT_PUBLIC_APP_URL - For job queue callbacks
 * [ ] QSTASH_TOKEN - For job queue (optional)
 *
 * MONITORING & OBSERVABILITY
 *
 * 1. Cache Hit Rate: Should be >60% for good performance
 * 2. API Response Time: Target <200ms for cached endpoints
 * 3. Error Rate: Should be <1% in production
 * 4. Queue Depth: Monitor to prevent backlog
 * 5. Rate Limit Hits: Watch for DDoS or abuse patterns
 */
