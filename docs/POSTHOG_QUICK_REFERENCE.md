# PostHog Quick Reference Card

## 🚀 Getting Started

```tsx
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

export function MyComponent() {
  const { trackCustomEvent } = usePostHogEvents()

  trackCustomEvent('my_event', { data: 'value' })
  
  return <>...</>
}
```

---

## 📊 Available Methods

### User Events
| Method | Usage | Example |
|--------|-------|---------|
| `identifyUser()` | Identify a user | `identifyUser(userId, { email })` |
| `setUserProperties()` | Set user properties | `setUserProperties({ plan: 'pro' })` |

### Authentication Events
| Method | Usage | Example |
|--------|-------|---------|
| `trackSignUp()` | Track registration | `trackSignUp({ method: 'email' })` |
| `trackLogin()` | Track login | `trackLogin({ method: 'email' })` |
| `trackLogout()` | Track logout | `trackLogout()` |

### Feature Events
| Method | Usage | Example |
|--------|-------|---------|
| `trackFeatureView()` | Feature viewed | `trackFeatureView('dashboard')` |
| `trackFeatureInteraction()` | User interacts | `trackFeatureInteraction('btn', 'click')` |

### Search & Discovery
| Method | Usage | Example |
|--------|-------|---------|
| `trackSearch()` | User searches | `trackSearch('query', { count: 42 })` |

### Errors & Performance
| Method | Usage | Example |
|--------|-------|---------|
| `trackError()` | Error occurred | `trackError('api_error', message)` |
| `trackPageLoadTime()` | Performance metric | `trackPageLoadTime(url, 1234)` |

### Conversions & Custom
| Method | Usage | Example |
|--------|-------|---------|
| `trackConversion()` | Conversion event | `trackConversion('purchase', { amount })` |
| `trackCustomEvent()` | Custom event | `trackCustomEvent('custom', {})` |

### Feature Flags
| Method | Usage | Example |
|--------|-------|---------|
| `isFeatureFlagEnabled()` | Check flag | `isFeatureFlagEnabled('new_feature')` |
| `getFeatureFlagValue()` | Get flag value | `getFeatureFlagValue('config_flag')` |

---

## 🎯 Common Patterns

### Track Sign Up
```tsx
const { trackSignUp, identifyUser } = usePostHogEvents()

trackSignUp({ method: 'email', email: 'user@example.com' })
identifyUser(userId, { email: 'user@example.com', name: 'User' })
```

### Track Login
```tsx
const { trackLogin, setUserProperties } = usePostHogEvents()

trackLogin({ method: 'email' })
setUserProperties({ last_login: new Date() })
```

### Track Purchase
```tsx
const { trackConversion } = usePostHogEvents()

trackConversion('purchase', {
  amount: 99.99,
  currency: 'USD',
  items: 3,
})
```

### Use Feature Flag
```tsx
const { isFeatureFlagEnabled } = usePostHogEvents()

if (isFeatureFlagEnabled('new_dashboard')) {
  return <NewDashboard />
}
```

### Track Error
```tsx
const { trackError } = usePostHogEvents()

try {
  // ... code
} catch (error) {
  trackError('operation_failed', error.message)
}
```

### Track Search
```tsx
const { trackSearch } = usePostHogEvents()

const results = performSearch(query)
trackSearch(query, { resultsCount: results.length })
```

---

## 🔑 Credentials

**API Key:** `phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY`  
**Host:** `https://eu.i.posthog.com`  
**Region:** EU (GDPR-compliant)

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `docs/POSTHOG_GUIDE.md` | Complete feature guide |
| `docs/POSTHOG_SETUP_SUMMARY.md` | Setup overview |
| `docs/POSTHOG_DEVELOPER_GUIDE.md` | Implementation patterns |
| `docs/POSTHOG_QUICK_REFERENCE.md` | This quick reference |
| `lib/posthog/config.ts` | Configuration constants |
| `lib/hooks/usePostHogEvents.ts` | React hook implementation |
| `components/posthog-provider.tsx` | Provider component |
| `components/examples/PostHogExample.tsx` | Working examples |

---

## 🎯 File Locations

```
project/
├── lib/
│   ├── hooks/usePostHogEvents.ts       # Import tracking hook
│   └── posthog/config.ts               # Configuration constants
├── components/
│   ├── posthog-provider.tsx            # Provider (in layout)
│   └── examples/PostHogExample.tsx    # Example usage
└── docs/
    └── POSTHOG_*.md                    # Documentation files
```

---

## 🔗 Dashboard Links

| Section | Link |
|---------|------|
| **Main Dashboard** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/ |
| **Events** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/events |
| **Session Replay** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/replay |
| **Feature Flags** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/feature_flags |
| **Experiments** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/experiments |
| **Analytics** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/insights |
| **Session Tracking** | https://us.posthog.com/project/sTMFPsFhdP1Ssg/replay/019d99ed-6de5-7c7d-a876-c096887d7a41?t=79 |
| **Admin Dashboard** | http://go/adminOrgEU/019d9422-9968-0000-6103-29167eb30778 |

---

## ⚙️ Configuration

All options already configured with sensible defaults:
- ✅ Session recording enabled (inputs masked)
- ✅ Autocapture enabled
- ✅ Event batching enabled
- ✅ GDPR compliance
- ✅ Privacy mode enabled
- ✅ Feature flags ready

---

## 🧪 Testing

```tsx
// Mock in tests
jest.mock('@/lib/hooks/usePostHogEvents', () => ({
  usePostHogEvents: jest.fn(() => ({
    trackCustomEvent: jest.fn(),
  })),
}))
```

---

## 🐛 Debugging

```javascript
// In browser console
posthog.debug() // Enable debug mode
posthog.isFeatureEnabled('flag') // Check flag
posthog.get_property('$user_id') // Get user ID
```

---

## 📋 Event Constants

Located in `lib/posthog/config.ts`:

```tsx
import { POSTHOG_CONFIG } from '@/lib/posthog/config'

// Usage
trackCustomEvent(POSTHOG_CONFIG.events.AUTH_SIGNUP)
```

---

## ✅ Setup Checklist

- [x] PostHog provider integrated
- [x] React hook created
- [x] Configuration added
- [x] Types defined
- [x] Documentation provided
- [x] Examples included
- [x] Session recording enabled
- [x] Feature flags ready
- [x] Privacy compliant
- [x] Production ready

---

## 🚨 Troubleshooting

**Events not appearing?**
- Check API key is correct
- Verify API host is reachable
- Open DevTools → Network tab

**Feature flags not working?**
- Create flag in PostHog dashboard
- Enable for your segment
- Clear localStorage: `localStorage.clear()`

**Session recording issues?**
- Verify session_recording is enabled
- Check privacy settings allow PostHog domain
- Wait 5-10 seconds for recording to start

---

## 📞 Support

- **Docs**: https://posthog.com/docs
- **Email**: support@posthog.com
- **Issues**: Check PostHog dashboard
