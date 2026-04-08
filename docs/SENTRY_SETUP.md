# Sentry Error Tracking Setup Guide

## Overview
Sentry integration provides real-time error tracking, performance monitoring, and session replay capabilities for the LiftGo application.

## Setup Steps

### 1. Create Sentry Project
1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Click "Create Project" → Select "Next.js"
4. Name it "LiftGo" and choose "Alert me on new errors"
5. Copy the DSN provided

### 2. Add Environment Variable
Add to your `.env.local` or Vercel project settings:

```
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_PROJECT.ingest.sentry.io/YOUR_ID
```

### 3. Features Enabled

#### Error Tracking
- Automatic error capture in Client and Server Components
- Custom error boundaries with fallback UI
- Error context tracking (user, breadcrumbs, etc.)

#### Performance Monitoring
- 10% transaction sample rate in production (configurable)
- 100% in development for testing

#### Session Replay
- Replays of errors (100% sample rate)
- Session videos for 10% of normal sessions
- Masked text and blocked media for privacy

## Usage Examples

### Capture Custom Errors
```typescript
import { captureException, addBreadcrumb } from '@/lib/sentry/client'

try {
  // risky operation
} catch (error) {
  addBreadcrumb('Operation failed', { context: 'checkout' })
  captureException(error as Error, { 
    operation: 'payment_processing',
    amount: 100
  })
}
```

### Track User Actions
```typescript
import { setUser, clearUser } from '@/lib/sentry/client'

// When user logs in
setUser({
  id: user.id,
  email: user.email,
  username: user.username
})

// When user logs out
clearUser()
```

### Add Context Breadcrumbs
```typescript
import { addBreadcrumb } from '@/lib/sentry/client'

addBreadcrumb(
  'User clicked checkout button',
  { cart_value: 500, items: 3 },
  'info'
)
```

### Use Error Boundary
```typescript
import { SentryErrorBoundary } from '@/components/sentry-error-boundary'

export default function Page() {
  return (
    <SentryErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>Custom error UI: {error.message}</p>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <YourComponent />
    </SentryErrorBoundary>
  )
}
```

## Configuration

### Sampling Rates (in `lib/sentry/init.ts`)
- **tracesSampleRate**: 0.1 (10%) in production, 1.0 (100%) in development
- **replaysSessionSampleRate**: 0.1 (10% of all sessions)
- **replaysOnErrorSampleRate**: 1.0 (100% of error sessions)

### Adjust sampling as needed:
```typescript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0 // 5% in production
```

## Dashboard Features

### Error Monitoring
- Real-time error notifications
- Error trends and patterns
- Stack traces with source maps
- Release tracking
- User impact analysis

### Performance Monitoring
- Transaction times
- Web Vitals (CLS, FID, LCP)
- Database query performance
- API endpoint performance

### Session Replay
- Video replays of user sessions
- See exactly what happened before an error
- Privacy-aware (text masked, media blocked)

## Best Practices

1. **Set User Context** - Always set user info after authentication
2. **Add Breadcrumbs** - Track important user actions leading to errors
3. **Use Error Boundaries** - Wrap critical sections with SentryErrorBoundary
4. **Tag Releases** - Deploy with release tags for version tracking
5. **Ignore Known Errors** - Configure Sentry to ignore third-party errors

## Environment-Specific Setup

### Local Development
- Full error capture (100% sample rate)
- Console logs and debugging
- Recommended: Enable session replay

### Staging
- 10% transaction sampling
- Test before production deployment
- Monitor performance baseline

### Production
- 10% transaction sampling (adjust as needed)
- Session replay on errors (100%)
- Normal sessions (10%)

## Monitoring & Alerts

### Set Up Alert Rules
1. Go to Sentry → Alerts
2. Create rule: "Error rate > 5% in 1 minute"
3. Actions: Email, Slack, PagerDuty

### Slack Integration
In Sentry:
1. Settings → Integrations → Slack
2. Authorize and select channel
3. Errors will be posted to #liftgo-alerts

## Troubleshooting

### DSN Not Set
- Check `.env.local` has `NEXT_PUBLIC_SENTRY_DSN`
- Verify in Sentry dashboard → Settings → Client Keys

### Not Capturing Errors
- Verify `hasSentry()` returns true in `lib/env.ts`
- Check browser console for Sentry initialization messages
- Ensure error occurs on client-side component (use 'use client')

### Performance Impact
- If sampling rates too high, reduce `tracesSampleRate`
- Session replay can be disabled: set `replaysSessionSampleRate: 0`

## Related Files
- `lib/sentry/init.ts` - Initialization
- `lib/sentry/client.ts` - Client utilities
- `components/sentry-error-boundary.tsx` - Error boundary
- `lib/env.ts` - Environment config
