# PostHog Developer Implementation Guide

## Overview

This guide provides developers with practical examples and patterns for implementing PostHog analytics in the project.

---

## Installation Status

✅ **posthog-js**: v1.253.0 (already installed in package.json)

No additional packages need to be installed.

---

## File Structure

```
project/
├── components/
│   ├── posthog-provider.tsx          # Main provider component
│   └── examples/
│       └── PostHogExample.tsx        # Working examples
├── lib/
│   ├── posthog/
│   │   └── config.ts                # Configuration constants
│   └── hooks/
│       └── usePostHogEvents.ts       # Custom tracking hook
├── types/
│   └── posthog-js.d.ts              # TypeScript definitions
├── app/
│   └── layout.tsx                   # Root layout (integrated)
└── docs/
    ├── POSTHOG_GUIDE.md             # Main guide
    ├── POSTHOG_SETUP_SUMMARY.md     # Setup summary
    └── POSTHOG_DEVELOPER_GUIDE.md   # This file
```

---

## Integration Checklist

- [x] PostHog provider initialized in root layout
- [x] Advanced configuration applied
- [x] Session recording enabled with privacy controls
- [x] Event tracking utilities created
- [x] Feature flags support added
- [x] TypeScript types defined
- [x] Custom React hook created
- [x] Example component provided
- [x] Documentation completed

---

## Usage Patterns

### Pattern 1: Basic Event Tracking

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function MyComponent() {
  const { trackCustomEvent } = usePostHogEvents()

  const handleAction = () => {
    trackCustomEvent('my_custom_event', {
      action: 'button_click',
      section: 'header',
    })
  }

  return (
    <button onClick={handleAction}>
      Click me
    </button>
  )
}
```

### Pattern 2: User Identification on Auth

```tsx
'use client'

import { useEffect } from 'react'
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'
import { useSession } from '@/lib/auth/useSession'

export function AuthWrapper({ children }) {
  const { session } = useSession()
  const { identifyUser, trackLogin } = usePostHogEvents()

  useEffect(() => {
    if (session?.user) {
      // Identify the user
      identifyUser(session.user.id, {
        email: session.user.email,
        name: session.user.name,
        plan: session.user.plan,
      })

      // Track successful login
      if (session.user.lastLoginDate === new Date().toDateString()) {
        trackLogin({
          method: 'session_restore',
          email: session.user.email,
        })
      }
    }
  }, [session, identifyUser, trackLogin])

  return children
}
```

### Pattern 3: Feature Flag Conditional Rendering

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function Dashboard() {
  const { isFeatureFlagEnabled, trackFeatureView } = usePostHogEvents()

  // Check if new dashboard is enabled
  const showNewDashboard = isFeatureFlagEnabled('new_dashboard_v2')

  useEffect(() => {
    if (showNewDashboard) {
      trackFeatureView('new_dashboard')
    }
  }, [showNewDashboard, trackFeatureView])

  return showNewDashboard ? <NewDashboard /> : <LegacyDashboard />
}
```

### Pattern 4: Error Boundary Integration

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    const { trackError } = usePostHogEvents()
    
    trackError(
      error.name || 'unknown_error',
      error.message,
      {
        component: errorInfo.componentStack,
        severity: 'error',
      }
    )
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }

    return this.props.children
  }
}
```

### Pattern 5: Form Submission Tracking

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function ContactForm() {
  const { trackConversion, trackError } = usePostHogEvents()

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        trackConversion('form_submission', {
          form_type: 'contact',
          fields_count: Object.keys(formData).length,
        })
      }
    } catch (error) {
      trackError('form_submission_failed', error.message)
    }
  }

  return (
    // ... form JSX
  )
}
```

### Pattern 6: Search Analytics

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'
import { useCallback } from 'react'

export function SearchComponent() {
  const { trackSearch } = usePostHogEvents()

  const handleSearch = useCallback((query, filters = {}) => {
    // Perform search...
    const results = performSearch(query, filters)

    // Track the search
    trackSearch(query, {
      resultsCount: results.length,
      filters,
      executionTime: results.executionTime,
    })

    return results
  }, [trackSearch])

  return (
    // ... search UI
  )
}
```

### Pattern 7: Analytics on Page/Section View

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function PageAnalytics() {
  const pathname = usePathname()
  const { trackFeatureView } = usePostHogEvents()

  useEffect(() => {
    // Track page view with metadata
    trackFeatureView('page_view', {
      page: pathname,
      title: document.title,
      referrer: document.referrer,
    })
  }, [pathname, trackFeatureView])

  return null
}
```

---

## Best Practices

### 1. Always Use the Custom Hook

❌ **Don't do this:**
```tsx
import posthog from 'posthog-js'

posthog.capture('event', { data })
```

✅ **Do this instead:**
```tsx
const { trackCustomEvent } = usePostHogEvents()

trackCustomEvent('event', { data })
```

**Why**: Provides type safety, error handling, and consistency.

### 2. Event Names Should Be Descriptive

❌ **Bad:**
```tsx
trackCustomEvent('click', { x: 100 })
```

✅ **Good:**
```tsx
trackCustomEvent('export_button_clicked', {
  format: 'csv',
  records_count: 1500,
})
```

### 3. Include Relevant Context

❌ **Minimal:**
```tsx
trackSignUp()
```

✅ **Comprehensive:**
```tsx
trackSignUp({
  method: 'google',
  email_domain: 'gmail.com',
  referrer: 'landing_page',
})
```

### 4. Identify Users Early

```tsx
useEffect(() => {
  if (user) {
    // Identify as soon as you have user data
    identifyUser(user.id, {
      email: user.email,
      plan: user.plan,
    })
  }
}, [user, identifyUser])
```

### 5. Use Configuration Constants

❌ **Bad:**
```tsx
trackCustomEvent('user_signup', { /* ... */ })
trackCustomEvent('user_sign_up', { /* ... */ })
trackCustomEvent('signup', { /* ... */ })
```

✅ **Good:**
```tsx
import { POSTHOG_CONFIG } from '@/lib/posthog/config'

trackCustomEvent(POSTHOG_CONFIG.events.AUTH_SIGNUP, { /* ... */ })
```

---

## Common Implementation Scenarios

### Scenario 1: Tracking E-Commerce Purchases

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function Checkout() {
  const { trackConversion } = usePostHogEvents()

  const handlePurchaseComplete = (order) => {
    trackConversion('purchase_completed', {
      order_id: order.id,
      total: order.total,
      currency: 'USD',
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      discount: order.discount,
    })
  }

  return (
    // ... checkout UI
  )
}
```

### Scenario 2: Tracking Feature Adoption

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function FeatureOnboarding() {
  const { trackFeatureView, trackFeatureInteraction } = usePostHogEvents()

  useEffect(() => {
    // Track that user viewed the feature
    trackFeatureView('advanced_analytics', { step: 'introduction' })
  }, [trackFeatureView])

  const handleStartTutorial = () => {
    trackFeatureInteraction('advanced_analytics', 'tutorial_started', {
      step: 'introduction',
    })
  }

  const handleCompleteStep = (stepNumber) => {
    trackFeatureInteraction('advanced_analytics', 'step_completed', {
      step: stepNumber,
    })
  }

  return (
    // ... onboarding UI
  )
}
```

### Scenario 3: Tracking API Performance

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

async function apiCall(endpoint) {
  const { trackPageLoadTime, trackError } = usePostHogEvents()
  
  const startTime = performance.now()

  try {
    const response = await fetch(endpoint)
    const duration = performance.now() - startTime

    trackPageLoadTime(`api_${endpoint}`, duration)

    return response.json()
  } catch (error) {
    trackError('api_error', error.message, {
      endpoint,
      errorType: error.name,
    })

    throw error
  }
}
```

### Scenario 4: A/B Testing Implementation

```tsx
'use client'

import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function Homepage() {
  const { isFeatureFlagEnabled, trackFeatureView } = usePostHogEvents()

  const variant = isFeatureFlagEnabled('homepage_v2') ? 'v2' : 'v1'

  useEffect(() => {
    trackFeatureView('homepage', {
      variant,
      timestamp: new Date().toISOString(),
    })
  }, [variant, trackFeatureView])

  return variant === 'v2' ? <HomepageV2 /> : <HomepageV1 />
}
```

---

## Testing

### Testing Event Tracking

```tsx
// In your test file
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

// Mock the hook
jest.mock('@/lib/hooks/usePostHogEvents', () => ({
  usePostHogEvents: jest.fn(),
}))

describe('MyComponent', () => {
  it('tracks event on button click', async () => {
    const mockTrackEvent = jest.fn()
    usePostHogEvents.mockReturnValue({
      trackCustomEvent: mockTrackEvent,
    })

    render(<MyComponent />)
    
    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(mockTrackEvent).toHaveBeenCalledWith('expected_event', expect.any(Object))
  })
})
```

---

## Debugging

### Enable Debug Mode

```tsx
// Automatically enabled in development
if (process.env.NODE_ENV === 'development') {
  import posthog from 'posthog-js'
  posthog.debug()
}
```

### Check PostHog Status in Console

```javascript
// In browser console
import posthog from 'posthog-js'

// Check if initialized
console.log(posthog.isFeatureEnabled('flag_name'))

// Get current user
console.log(posthog.get_property('$user_id'))

// View all events
console.log(posthog.__loaded_plugins)
```

---

## Performance Optimization

### 1. Batch Events for Better Performance

Events are automatically batched:
- Sent in groups of 50 events
- Or after 10 seconds timeout

This is configured in the provider.

### 2. Use LocalStorage Persistence

PostHog persists data to localStorage to:
- Survive page reloads
- Track user across sessions
- Maintain session ID

### 3. Defer Tracking to Idle Callback

```tsx
const { trackCustomEvent } = usePostHogEvents()

// Track non-critical events only when idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    trackCustomEvent('non_critical_event', {})
  })
}
```

---

## Migration Guide

If migrating from another analytics solution:

### 1. Replace Event Names
```tsx
// Old: gtag('event', 'purchase', { value: 99 })
// New:
trackConversion('purchase', { amount: 99 })
```

### 2. Replace User Identification
```tsx
// Old: analytics.identify(userId, { email })
// New:
identifyUser(userId, { email })
```

### 3. Replace User Properties
```tsx
// Old: analytics.traits({ plan: 'pro' })
// New:
setUserProperties({ plan: 'pro' })
```

---

## Environment Variables

The setup uses these with defaults already included:

```bash
# Optional: Override these in .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_DEFAULTS=2026-01-30
```

---

## Troubleshooting

### Events Not Appearing

1. Check PostHog key is correct
2. Verify API host is reachable
3. Open DevTools → Network tab
4. Look for requests to `eu.i.posthog.com`

### Type Errors

```tsx
// Make sure to import from correct location
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

// Don't import posthog directly for client components
// import posthog from 'posthog-js' // ❌ Avoid
```

### Feature Flags Not Working

1. Create flag in PostHog dashboard
2. Enable for your user segment
3. Clear localStorage: `localStorage.clear()`
4. Reload page
5. Call `isFeatureFlagEnabled()` with correct flag name

---

## Resources

- **PostHog Docs**: https://posthog.com/docs
- **React Integration**: https://posthog.com/docs/integrate/client/react
- **API Reference**: https://posthog.com/docs/api/capture
- **Best Practices**: https://posthog.com/blog/product-analytics-best-practices

---

## Support

For implementation help:
1. Check `docs/POSTHOG_GUIDE.md` for detailed guide
2. Review `components/examples/PostHogExample.tsx` for working code
3. Check `lib/posthog/config.ts` for available constants
4. Visit PostHog docs: https://posthog.com/docs
