# Upstash Redis Implementation Guide

Complete guide to using all Upstash Redis features in your application.

## Overview

Your project now has 6 comprehensive Redis features fully integrated:

1. **Rate Limiting** - Protect APIs from abuse
2. **Caching Layer** - Speed up read operations
3. **Session Management** - Secure user sessions
4. **Job Queue Enhancements** - Monitor async operations
5. **Real-time Features** - Presence, activity, notifications
6. **Analytics & Metrics** - Track performance and engagement

## Quick Start

### 1. Environment Variables

Your Upstash Redis environment variables are already configured:

```
KV_REST_API_URL=your-upstash-url
KV_REST_API_TOKEN=your-upstash-token
REDIS_URL=your-redis-url
```

### 2. Basic Caching

```typescript
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// Get or fetch from database
const user = await getOrSetCache(
  CACHE_KEYS.user('user_123'),
  async () => {
    // This only runs if cache miss
    return await db.users.findUnique({ id: 'user_123' })
  },
  CACHE_TTL.MEDIUM_SHORT // 15 minutes
)
```

### 3. Rate Limiting

```typescript
import { searchLimiter } from '@/lib/rate-limit/limiters'
import { getIdentifier } from '@/lib/rate-limit/rate-limiter'

const identifier = getIdentifier(request, userId)
const check = await searchLimiter.check(identifier)

if (!check.allowed) {
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### 4. Sessions

```typescript
import { createSession, validateSession, deleteSession } from '@/lib/sessions'

// Create session
const session = await createSession({
  userId: 'user_123',
  userEmail: 'user@example.com',
  ttlSeconds: 24 * 60 * 60,
})

// Validate session
const result = await validateSession(session.id)
if (!result.valid) {
  // Session expired or not found
}

// Logout
await deleteSession(session.id)
```

### 5. Notifications

```typescript
import { createNotification, getUserNotifications, markNotificationAsRead } from '@/lib/realtime'

// Send notification
await createNotification({
  userId: 'user_123',
  type: 'success',
  title: 'Offer Accepted',
  message: 'Your offer has been accepted!',
})

// Get user notifications
const notifs = await getUserNotifications('user_123', 20)

// Mark as read
await markNotificationAsRead('user_123', 'notification_id')
```

### 6. Analytics

```typescript
import { recordAPIMetric, recordUserEngagement, getAPIMetricsSummary } from '@/lib/analytics'

// Track API call
await recordAPIMetric('/api/tasks', 150, 200, userId)

// Track user action
await recordUserEngagement(userId, 'offer_created', {
  amount: 100,
  taskId: 'task_123',
})

// Get dashboard data
const summary = await getAPIMetricsSummary('/api/tasks', 7)
console.log(`Success rate: ${summary.successRate}%`)
```

## File Structure

```
lib/
├── cache/                     # Caching layer
│   ├── redis-client.ts       # Redis singleton
│   ├── cache-keys.ts         # Cache key patterns
│   ├── strategies.ts         # Cache operations
│   ├── cache-invalidation.ts # Invalidation logic
│   ├── examples.ts           # Usage examples
│   └── index.ts              # Exports
├── rate-limit/               # Rate limiting
│   ├── rate-limiter.ts       # Core limiter (existing)
│   ├── limiters.ts           # Pre-configured limiters
│   ├── with-rate-limit.ts    # Middleware (existing)
│   └── index.ts              # Exports
├── sessions/                 # Session management
│   ├── types.ts              # Session types
│   ├── redis-session-store.ts # Session store
│   └── index.ts              # Exports
├── queue/                    # Job queue (existing + enhanced)
│   ├── queue.ts              # Core queue (existing)
│   ├── job-monitoring.ts     # Job tracking
│   ├── processor.ts          # Job processor (existing)
│   └── workers/              # Job handlers (existing)
├── realtime/                 # Real-time features
│   ├── presence.ts           # User presence tracking
│   ├── activity-stream.ts    # Activity logging
│   ├── notifications.ts      # Notifications
│   └── index.ts              # Exports
├── analytics/                # Analytics & metrics
│   ├── redis-metrics.ts      # Metrics collection
│   └── index.ts              # Exports
└── INTEGRATION_EXAMPLES.md   # API integration patterns
```

## Cache TTLs

| Type | Duration | Use Case |
|------|----------|----------|
| SHORT | 5 min | Hot data (search results, stats) |
| MEDIUM_SHORT | 15 min | User data, permissions |
| MEDIUM | 1 hour | Pricing, categories |
| LONG | 24 hours | AI responses, reference data |
| VERY_LONG | 7 days | Static/archive data |

## Rate Limits

| Endpoint | Window | Limit | Purpose |
|----------|--------|-------|---------|
| Auth | 15 min | 10 | Login/register |
| Inquiry | 1 hour | 5 | Prevent spam |
| Offer | 1 hour | 20 | Bid submission |
| Search | 1 min | 60 | Browse |
| Upload | 1 hour | 20 | File limits |
| Payment | 1 min | 10 | Transaction safety |

## Pattern Examples

### Pattern 1: Cache-Aside (Most Common)

```typescript
const data = await getOrSetCache(key, () => fetchFromDB(), ttl)
```

### Pattern 2: Write-Through

```typescript
await updateDatabase(data)
await invalidateCache(key)
```

### Pattern 3: Rate Limit + Cache

```typescript
const allowed = await limiter.check(identifier)
if (!allowed) return 429
const data = await getOrSetCache(key, fetchFromDB, ttl)
```

### Pattern 4: Activity + Notification

```typescript
await logActivity({ type: 'created', ...metadata })
await createNotification({ userId, type: 'success', ...message })
```

## Monitoring Checklist

### Daily Metrics

- [ ] Cache hit rate >60%
- [ ] API response time <200ms
- [ ] Error rate <1%
- [ ] Queue depth normal
- [ ] No rate limit abuse

### Weekly Review

- [ ] Top endpoints analysis
- [ ] User engagement trends
- [ ] Most common errors
- [ ] Performance trends
- [ ] Redis memory usage

### Production Alerts

Set up alerts for:

```
cache_hit_rate < 50% 
api_response_time > 500ms
error_rate > 5%
queue_depth > 1000
rate_limit_hits > threshold
redis_memory > 80%
```

## Common Patterns & Best Practices

### 1. Always Use Cache Keys Helpers

```typescript
// ✅ Good - Type-safe and organized
const key = CACHE_KEYS.user(userId)

// ❌ Bad - Manual key construction
const key = `user:${userId}`
```

### 2. Use TTL Constants

```typescript
// ✅ Good - Consistent, documented
await setInCache(key, value, CACHE_TTL.MEDIUM)

// ❌ Bad - Magic numbers
await setInCache(key, value, 3600)
```

### 3. Invalidate After Updates

```typescript
// ✅ Good - Cache stays fresh
await updateDatabase(data)
await invalidateUserCache(userId)

// ❌ Bad - Stale cache
await updateDatabase(data)
// No invalidation = users see old data
```

### 4. Handle Redis Unavailability

```typescript
// ✅ Good - Graceful degradation
const data = await getOrSetCache(key, fetchFromDB, ttl)
// Falls back to DB if Redis down

// ❌ Bad - App crashes
const client = getRedis()
await client.get(key) // Crashes if Redis down
```

### 5. Batch Operations

```typescript
// ✅ Good - Efficient
await msetInCache(pairs, ttl)
const results = await mgetFromCache(keys)

// ❌ Bad - N+1 queries
for (const key of keys) {
  await setInCache(key, value, ttl)
}
```

## Troubleshooting

### High Memory Usage

Check what's cached:
```typescript
const stats = await getCacheStats()
```

Solution: Reduce TTLs or enable cache eviction in Upstash console.

### Low Cache Hit Rate

Debug why:
```typescript
// Track cache hits/misses
await recordCacheMetric(true, key) // hit
await recordCacheMetric(false, key) // miss

// Review patterns
const perf = await getCachePerformance()
```

### Rate Limits Blocking Legitimate Users

Review settings:
```typescript
console.log(RATE_LIMITERS)
// Adjust limits in /lib/rate-limit/limiters.ts
```

### Session Timeout Issues

Check TTL:
```typescript
const ttl = await getCacheTTL(sessionKey)
// Extend if needed
await extendSession(sessionId, 3600)
```

## Performance Tips

1. **Cache More Aggressively** - Increase SHORT TTLs to 15 min
2. **Use Bulk Operations** - mget/mset instead of loops
3. **Monitor Memory** - Upstash console shows usage
4. **Compress Large Objects** - JSON.stringify before caching
5. **Expire Old Data** - Set TTLs on all keys

## Security Best Practices

1. **Never Log Sensitive Data** - Avoid logging auth tokens
2. **Use Sessions** - Don't store user data in JWTs
3. **Rate Limit Aggressively** - Especially auth endpoints
4. **Validate Input** - Before caching user data
5. **Rotate Keys** - Upstash allows key rotation
6. **Use HTTPS** - Always for Redis connections (already done)

## Next Steps

1. **Test Integration** - Run examples in your API routes
2. **Monitor Metrics** - Watch cache/error rates
3. **Optimize TTLs** - Adjust based on data freshness needs
4. **Add Alerting** - Set up monitoring for production
5. **Document Custom Patterns** - Add to this guide

## Support & Resources

- **Upstash Docs**: https://upstash.com/docs/redis
- **Redis Commands**: https://redis.io/commands/
- **Performance Blog**: https://upstash.com/blog
- **Vercel Docs**: https://vercel.com/docs

## Summary

You now have a production-ready Redis infrastructure with:

- ✅ Distributed rate limiting
- ✅ Multi-layer caching
- ✅ Secure session management
- ✅ Real-time notifications
- ✅ Comprehensive analytics
- ✅ Graceful error handling
- ✅ Built-in monitoring

Start by copying patterns from `INTEGRATION_EXAMPLES.md` into your API routes!
