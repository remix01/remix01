# PostHog Advanced Analytics Setup

## Overview

This project uses **PostHog** for comprehensive product analytics, session recording, and feature flag management. The setup is EU-compliant and configured for advanced tracking scenarios.

**Project Details:**
- **API Key:** `phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY`
- **API Host:** `https://eu.i.posthog.com` (EU Data Center)
- **Dashboard:** https://us.posthog.com/project/sTMFPsFhdP1Ssg/
- **Session URL:** https://us.posthog.com/project/sTMFPsFhdP1Ssg/replay/019d99ed-6de5-7c7d-a876-c096887d7a41?t=79
- **Admin Dashboard:** http://go/adminOrgEU/019d9422-9968-0000-6103-29167eb30778 (Project ID: 160077)

## Features

### 1. **Advanced Session Recording**
- Automatic recording of user interactions
- Input masking for privacy (passwords, sensitive data)
- Text content masking
- Performance metrics collection
- Privacy-compliant (GDPR-compliant)

### 2. **Event Tracking**
- Automatic page views and navigation
- Click and interaction tracking
- Form submission tracking
- Custom event tracking

### 3. **Feature Flags & Experiments**
- Create A/B tests
- Feature flag rollouts
- Experiment tracking
- Multivariate testing

### 4. **User Identification**
- Identify users with custom properties
- Track user properties and segments
- User property updates
- Session management

## Setup Files

### Core Files
- **`components/posthog-provider.tsx`** - React provider component and utilities
- **`types/posthog-js.d.ts`** - TypeScript type definitions
- **`lib/posthog/config.ts`** - Configuration constants
- **`lib/hooks/usePostHogEvents.ts`** - Custom React hook for event tracking

### Integration
The provider is integrated in `app/layout.tsx`:
```tsx
<PostHogProvider>
  <React.Suspense fallback={null}>
    <PostHogPageView />
  </React.Suspense>
  {children}
</PostHogProvider>
```

## Usage Examples

### 1. Basic Event Tracking

#### Using the Hook
```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function LoginForm() {
  const { trackLogin } = usePostHogEvents()

  const handleLogin = async (email: string, password: string) => {
    try {
      // ... login logic
      trackLogin({ method: 'email', email })
    } catch (error) {
      // ... error handling
    }
  }

  return (
    // ... form JSX
  )
}
```

#### Using Direct Utils
```tsx
import { posthogUtils } from '@/components/posthog-provider'

// Track custom events
posthogUtils.trackEvent('button_clicked', {
  button_name: 'subscribe',
  page: 'pricing',
})
```

### 2. User Identification

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function UserProfile({ user }) {
  const { identifyUser } = usePostHogEvents()

  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
        plan: user.plan,
      })
    }
  }, [user, identifyUser])

  return (
    // ... profile JSX
  )
}
```

### 3. Feature Flag Usage

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function NewFeature() {
  const { isFeatureFlagEnabled, trackFeatureView } = usePostHogEvents()

  useEffect(() => {
    if (isFeatureFlagEnabled('new_dashboard')) {
      trackFeatureView('new_dashboard')
    }
  }, [isFeatureFlagEnabled, trackFeatureView])

  return (
    // ... component JSX
  )
}
```

### 4. Error Tracking

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function DataFetch() {
  const { trackError } = usePostHogEvents()

  const fetchData = async () => {
    try {
      // ... fetch logic
    } catch (error) {
      trackError(
        'fetch_failed',
        error.message,
        {
          endpoint: '/api/data',
          status: error.status,
        }
      )
    }
  }

  return (
    // ... component JSX
  )
}
```

### 5. Search Tracking

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function SearchComponent() {
  const { trackSearch } = usePostHogEvents()

  const handleSearch = (query: string, results: any[]) => {
    trackSearch(query, {
      resultsCount: results.length,
    })
  }

  return (
    // ... search JSX
  )
}
```

### 6. Conversion Tracking

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function CheckoutPage() {
  const { trackConversion } = usePostHogEvents()

  const handlePurchase = async () => {
    try {
      // ... purchase logic
      trackConversion('purchase', {
        amount: 99.99,
        currency: 'USD',
        items: 3,
      })
    } catch (error) {
      // ... error handling
    }
  }

  return (
    // ... checkout JSX
  )
}
```

## Event Reference

### Authentication Events
- `user_signup` - User signs up
- `user_login` - User logs in
- `user_logout` - User logs out
- `social_signup` - User signs up with social provider

### Feature Events
- `feature_viewed` - User views a feature
- `feature_interaction` - User interacts with a feature
- `feature_completed` - User completes a feature

### Search Events
- `search_performed` - User performs a search
- `search_filtered` - User applies filters

### E-Commerce Events
- `item_viewed` - User views an item
- `item_added_to_cart` - User adds item to cart
- `checkout_started` - User starts checkout
- `purchase_completed` - User completes purchase

### Error Events
- `error_occurred` - An error occurs

### Performance Events
- `page_load_performance` - Page load metrics

## Configuration

### Enable/Disable Features

Edit `components/posthog-provider.tsx` to control features:

```tsx
posthog.init(POSTHOG_KEY, {
  // Disable session recording
  session_recording: false,

  // Disable autocapture
  autocapture: false,

  // Disable page view tracking
  capture_pageview: false,
})
```

### Privacy Settings

The setup respects:
- **GDPR**: EU data center with proper handling
- **Do Not Track**: Browser's DNT preference is respected
- **Input Masking**: All sensitive inputs are masked
- **Text Masking**: Content is masked for privacy

### Session Recording

Session recording is configured with:
- **All inputs masked** - Passwords, sensitive data protected
- **Text content masked** - User text content protected
- **Canvas recording disabled** - No canvas capture
- **Performance metrics enabled** - Collect page performance

## Advanced Features

### 1. Custom Properties

```tsx
const { setUserProperties } = usePostHogEvents()

setUserProperties({
  subscription_level: 'premium',
  usage_count: 42,
  last_payment_date: '2024-01-15',
})
```

### 2. Feature Flags

Create a feature flag in PostHog dashboard:

```tsx
const { isFeatureFlagEnabled, getFeatureFlagValue } = usePostHogEvents()

if (isFeatureFlagEnabled('beta_feature')) {
  // Show beta feature
}

const rolloutPercentage = getFeatureFlagValue('rollout_test')
```

### 3. Experiments

PostHog integrates with your feature flags for experiments:

```tsx
// Feature flag automatically handles A/B test bucketing
if (isFeatureFlagEnabled('variant_a')) {
  // Show variant A
} else {
  // Show variant B (control)
}
```

## Monitoring & Debugging

### Development Mode Debug

When `NODE_ENV === 'development'`, PostHog automatically enables debug mode:

```
[PostHog] Initialized in development mode
```

Check browser console for debug output.

### Verify Events in Console

```tsx
// Access posthog directly for debugging
import posthog from 'posthog-js'

// Check if feature flag is enabled
console.log(posthog.isFeatureEnabled('feature_name'))

// Get current user ID
console.log(posthog.get_property('$user_id'))
```

## Dashboard Access

1. **Main Dashboard**: https://us.posthog.com/project/sTMFPsFhdP1Ssg/
2. **Session Replay**: https://us.posthog.com/project/sTMFPsFhdP1Ssg/replay/
3. **Events**: `/project/sTMFPsFhdP1Ssg/events`
4. **Feature Flags**: `/project/sTMFPsFhdP1Ssg/feature_flags`
5. **Experiments**: `/project/sTMFPsFhdP1Ssg/experiments`
6. **Dashboards**: `/project/sTMFPsFhdP1Ssg/dashboards`

## Best Practices

### 1. Track Meaningful Events
Only track events that provide business value. Avoid tracking everything.

### 2. Use Consistent Event Names
Use the predefined event names from `config.ts` for consistency.

### 3. Add Context to Events
Always include relevant properties:
```tsx
trackEvent('page_viewed', {
  page_type: 'product',
  category: 'electronics',
})
```

### 4. Identify Users Early
Call `identifyUser()` as soon as you know the user ID:
```tsx
useEffect(() => {
  if (session?.user?.id) {
    identifyUser(session.user.id, {
      email: session.user.email,
    })
  }
}, [session])
```

### 5. Handle Errors Gracefully
Always wrap PostHog calls in try-catch for production:
```tsx
try {
  trackEvent('critical_action', { data })
} catch (error) {
  console.error('PostHog tracking failed:', error)
}
```

## Troubleshooting

### Events Not Showing

1. Check if `NEXT_PUBLIC_POSTHOG_KEY` is set
2. Verify API host is reachable
3. Check browser console for errors
4. Verify event names in PostHog dashboard

### Session Recording Issues

1. Check if `session_recording` is enabled
2. Verify page has `PostHogProvider` wrapper
3. Check browser privacy settings (not blocking PostHog domain)
4. Verify input masking works (check recorder settings)

### Feature Flags Not Working

1. Create feature flag in PostHog dashboard first
2. Ensure flag is enabled for your user/organization
3. Clear browser cache and localStorage
4. Wait a few seconds for flag to propagate

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_DEFAULTS=2026-01-30
```

## Resources

- **PostHog Documentation**: https://posthog.com/docs
- **React Integration**: https://posthog.com/docs/integrate/client/react
- **Session Recording**: https://posthog.com/docs/session-replay
- **Feature Flags**: https://posthog.com/docs/feature-flags
- **API Reference**: https://posthog.com/docs/api

## Support

For issues or questions:
1. Check PostHog documentation
2. Review browser console for errors
3. Check network tab for API calls
4. Contact PostHog support: support@posthog.com
