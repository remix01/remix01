# Upstash Redis Quick Reference

**Status:** ✅ Complete & Ready to Use | **Date:** March 24, 2026

## 🚀 Quick Start (60 seconds)

```typescript
// 1. Import
import { 
  checkRateLimit, 
  getOrSetCache, 
  createSession,
  recordAPIMetric,
  setUserOnline,
  CACHE_KEYS,
  CACHE_TTL 
} from '@/lib'

// 2. Use in your code
const limited = await checkRateLimit('user:123', 10, 60000)
const cached = await getOrSetCache(CACHE_KEYS.user(userId), fetchUser)
const session = await createSession({ userId, userEmail })
await recordAPIMetric('/api/endpoint', duration, status)
await setUserOnline(userId)
```

## 📚 Feature Reference

### Rate Limiting
```typescript
import { checkRateLimit } from '@/lib'

const result = await checkRateLimit(key, maxRequests, windowMs)
// result: { allowed: boolean, retryAfter?: number }
```

### Caching
```typescript
import { getOrSetCache, cascadeInvalidateTask, CACHE_KEYS, CACHE_TTL } from '@/lib'

// Get or cache
const data = await getOrSetCache(
  CACHE_KEYS.task(taskId),
  () => db.task.findUnique({ where: { id: taskId } }),
  CACHE_TTL.MEDIUM
)

// Invalidate
await cascadeInvalidateTask(taskId)
```

### Sessions
```typescript
import { createSession, validateSession, destroySession } from '@/lib'

// Create
const session = await createSession({ userId, userEmail, ipAddress, userAgent })

// Validate
const valid = await validateSession(sessionId)

// Destroy
await destroySession(sessionId)
```

### Job Queue
```typescript
import { trackJobStatus, completeJob, getQueueStatistics } from '@/lib'

await trackJobStatus(jobId, 'sendEmail', 'pending')
await completeJob(jobId)
const stats = await getQueueStatistics()
```

### Real-Time
```typescript
import { 
  setUserOnline, 
  logActivity, 
  createNotification,
  getUnreadNotificationCount 
} from '@/lib'

await setUserOnline(userId)
await logActivity('task-123', { type: 'viewed', userId })
await createNotification({ userId, type: 'alert', title: 'New bid' })
const count = await getUnreadNotificationCount(userId)
```

### Analytics
```typescript
import { 
  recordAPIMetric, 
  recordUserEngagement,
  getAPIMetricsSummary,
  getCachePerformance 
} from '@/lib'

await recordAPIMetric('/api/tasks', duration, status, userId)
await recordUserEngagement(userId, 'task_created')
const metrics = await getAPIMetricsSummary('/api/tasks', 7)
const cache = await getCachePerformance(7)
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `lib/index.ts` | Centralized imports |
| `lib/rateLimit.ts` | Rate limiting |
| `lib/cache/` | Caching system |
| `lib/sessions/redis-session-store.ts` | Session management |
| `lib/queue/job-monitoring.ts` | Job tracking |
| `lib/realtime/` | Presence, activity, notifications |
| `lib/analytics/redis-metrics.ts` | Metrics collection |
| `REDIS_SETUP_README.md` | Full setup guide |
| `REDIS_IMPLEMENTATION_GUIDE.ts` | Code examples |

## ✨ Pre-configured Features

- ✅ All environment variables set
- ✅ Singleton Redis client
- ✅ Type-safe operations
- ✅ Graceful error handling
- ✅ In-memory fallbacks
- ✅ Comprehensive logging

## 🔗 Import Patterns

```typescript
// Individual imports
import { checkRateLimit } from '@/lib/rateLimit'
import { getOrSetCache } from '@/lib/cache'

// Grouped imports
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '@/lib'

// Full module import
import * as Cache from '@/lib/cache'
import * as Sessions from '@/lib/sessions'
import * as RealTime from '@/lib/realtime'
import * as Analytics from '@/lib/analytics'
```

## 📊 Monitoring

```typescript
// Cache stats
const stats = await getCacheStats()

// Queue stats
const queue = await getQueueStatistics()

// API metrics
const api = await getAPIMetricsSummary('/api/tasks', 7)

// Cache performance
const cache = await getCachePerformance(7)

// Top endpoints
const top = await getTopEndpoints(5)
```

## 🛡️ Error Handling

All Redis operations fail gracefully:
- ✅ Rate limiting → in-memory fallback
- ✅ Caching → null (re-fetch)
- ✅ Sessions → null (re-auth)
- ✅ Analytics → silent skip
- ✅ Real-time → graceful degrade

## 🎯 Common Patterns

### Secure API Endpoint
```typescript
export async function POST(req: Request) {
  const userId = await getUser(req)
  
  // Rate limit
  const limit = await checkRateLimit(`api:${userId}`, 10, 3600000)
  if (!limit.allowed) return new Response('Too many requests', { status: 429 })
  
  // Business logic
  const result = await doSomething()
  
  // Track
  await recordAPIMetric('/api/endpoint', duration, 200, userId)
  
  return Response.json(result)
}
```

### Cached Query
```typescript
const user = await getOrSetCache(
  CACHE_KEYS.user(userId),
  () => db.user.findUnique({ where: { id: userId } }),
  CACHE_TTL.MEDIUM_SHORT
)
```

### Session Validation Middleware
```typescript
const validation = await validateSession(sessionId)
if (!validation.valid) {
  return new Response('Unauthorized', { status: 401 })
}
```

### Dashboard Data
```typescript
const [tasks, user, stats] = await Promise.all([
  getOrSetCache(CACHE_KEYS.taskList(userId), fetchTasks, CACHE_TTL.SHORT),
  getOrSetCache(CACHE_KEYS.user(userId), fetchUser, CACHE_TTL.MEDIUM),
  getOrSetCache(CACHE_KEYS.userStats(userId), fetchStats, CACHE_TTL.SHORT)
])
```

## 📖 Documentation Files

1. **REDIS_SETUP_README.md** - Getting started
2. **REDIS_IMPLEMENTATION_GUIDE.ts** - Code examples
3. **UPSTASH_REDIS_COMPLETE_SUMMARY.ts** - Full details
4. **This file** - Quick reference

## 🚨 Troubleshooting

**Redis not working?**
- Check env vars: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- App continues with graceful degradation
- Check console for `[Redis]` warning logs

**Cache not caching?**
- Verify TTL is set correctly
- Check cache key format
- Monitor cache stats: `getCacheStats()`

**Session not persisting?**
- Verify Redis is available
- Check session ID is being stored
- Review session TTL settings

## 🔗 Links

- [Upstash Documentation](https://upstash.com/docs)
- [Redis Commands](https://redis.io/commands/)
- [Project Configuration](./REDIS_SETUP_README.md)

## ✅ Checklist

- [ ] Read REDIS_SETUP_README.md
- [ ] Review REDIS_IMPLEMENTATION_GUIDE.ts
- [ ] Run verify script: `npx ts-node lib/verify-redis-setup.ts`
- [ ] Add rate limiting to API routes
- [ ] Cache your expensive queries
- [ ] Set up session management
- [ ] Track real-time events
- [ ] Collect metrics
- [ ] Monitor performance

**Everything is ready to use! 🎉**
