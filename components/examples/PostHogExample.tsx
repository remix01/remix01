'use client'

import { useEffect, useState } from 'react'
import { usePostHogEvents } from '@/lib/hooks/usePostHogEvents'

/**
 * Example component demonstrating all PostHog tracking features
 * This is for reference and testing purposes
 */
export function PostHogExample() {
  const {
    identifyUser,
    setUserProperties,
    trackSignUp,
    trackLogin,
    trackLogout,
    trackFeatureView,
    trackFeatureInteraction,
    trackSearch,
    trackError,
    trackPageLoadTime,
    trackConversion,
    trackCustomEvent,
    isFeatureFlagEnabled,
    getFeatureFlagValue,
  } = usePostHogEvents()

  const [loaded, setLoaded] = useState(false)

  // Example: Track page load performance
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const loadTime = performance.now() - startTime
      trackPageLoadTime(window.location.pathname, loadTime)
    }
  }, [trackPageLoadTime])

  // Example: Feature flag check on mount
  useEffect(() => {
    setLoaded(true)
    if (isFeatureFlagEnabled('example_feature')) {
      console.log('Example feature is enabled!')
    }
  }, [isFeatureFlagEnabled])

  // ─── EXAMPLE EVENT HANDLERS ────────────────────────────────────────
  
  const handleSignUp = () => {
    trackSignUp({
      method: 'email',
      email: 'example@test.com',
    })

    // Identify user after signup
    identifyUser('user_123', {
      email: 'example@test.com',
      name: 'Example User',
      plan: 'free',
    })
  }

  const handleLogin = () => {
    trackLogin({
      method: 'email',
      email: 'example@test.com',
    })

    // Set user properties on login
    setUserProperties({
      last_login: new Date().toISOString(),
      login_count: 5,
    })
  }

  const handleFeatureView = () => {
    trackFeatureView('premium_dashboard', {
      section: 'analytics',
    })
  }

  const handleFeatureInteraction = () => {
    trackFeatureInteraction('export_button', 'clicked', {
      format: 'csv',
      records: 1500,
    })
  }

  const handleSearch = () => {
    trackSearch('machine learning tutorials', {
      resultsCount: 42,
      filters: {
        category: 'education',
        language: 'en',
      },
    })
  }

  const handleError = () => {
    try {
      throw new Error('Example error for testing')
    } catch (error: any) {
      trackError(
        'example_error',
        error.message,
        {
          component: 'PostHogExample',
          severity: 'warning',
        }
      )
    }
  }

  const handleConversion = () => {
    trackConversion('premium_signup', {
      amount: 99.99,
      currency: 'USD',
      billing_cycle: 'yearly',
    })
  }

  const handleCustomEvent = () => {
    trackCustomEvent('custom_action_performed', {
      action_type: 'advanced_export',
      data_size: 2500,
      duration_ms: 1234,
    })
  }

  if (!loaded) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">PostHog Event Examples</h2>
      
      {/* Authentication Events */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Authentication Events</h3>
        <button
          onClick={handleSignUp}
          className="mr-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Track Sign Up
        </button>
        <button
          onClick={handleLogin}
          className="mr-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Track Login
        </button>
        <button
          onClick={trackLogout}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Track Logout
        </button>
      </section>

      {/* Feature Events */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Feature Events</h3>
        <button
          onClick={handleFeatureView}
          className="mr-2 rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
        >
          Track Feature View
        </button>
        <button
          onClick={handleFeatureInteraction}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
        >
          Track Feature Interaction
        </button>
      </section>

      {/* Search & Discovery */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Search & Discovery</h3>
        <button
          onClick={handleSearch}
          className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
        >
          Track Search
        </button>
      </section>

      {/* Error Tracking */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Error Tracking</h3>
        <button
          onClick={handleError}
          className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
        >
          Track Error
        </button>
      </section>

      {/* Conversion Events */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Conversion Events</h3>
        <button
          onClick={handleConversion}
          className="rounded bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
        >
          Track Conversion
        </button>
      </section>

      {/* Custom Events */}
      <section className="space-y-2 border-b pb-4">
        <h3 className="text-lg font-semibold">Custom Events</h3>
        <button
          onClick={handleCustomEvent}
          className="rounded bg-pink-500 px-4 py-2 text-white hover:bg-pink-600"
        >
          Track Custom Event
        </button>
      </section>

      {/* Feature Flags */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Feature Flags</h3>
        <div className="rounded bg-gray-100 p-4">
          <p className="mb-2">
            Example Feature Enabled:{' '}
            <code className="font-mono font-bold">
              {isFeatureFlagEnabled('example_feature') ? '✓ Yes' : '✗ No'}
            </code>
          </p>
          <p>
            Feature Flag Value:{' '}
            <code className="font-mono font-bold">
              {JSON.stringify(getFeatureFlagValue('example_feature'), null, 2)}
            </code>
          </p>
        </div>
      </section>

      {/* Instructions */}
      <section className="mt-8 rounded bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold">Instructions</h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>Click the buttons above to trigger different events</li>
          <li>Check the PostHog dashboard to see the events in real-time</li>
          <li>Open browser DevTools to see debug output</li>
          <li>Session recordings will automatically capture your interactions</li>
          <li>
            Visit{' '}
            <a
              href="https://us.posthog.com/project/sTMFPsFhdP1Ssg/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              PostHog Dashboard
            </a>
            {' '}to view analytics
          </li>
        </ul>
      </section>
    </div>
  )
}

/**
 * Usage Instructions:
 *
 * 1. Import this component into a page:
 *    import { PostHogExample } from '@/components/examples/PostHogExample'
 *
 * 2. Use it in your page:
 *    export default function Page() {
 *      return <PostHogExample />
 *    }
 *
 * 3. The component will track all events to PostHog
 *
 * 4. View events in real-time on:
 *    https://us.posthog.com/project/sTMFPsFhdP1Ssg/events
 */
