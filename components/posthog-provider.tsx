'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { POSTHOG_CONFIG } from '@/lib/posthog/config'

const POSTHOG_KEY = POSTHOG_CONFIG.apiKey
const POSTHOG_HOST = POSTHOG_CONFIG.apiHost

type PostHogFlaggedWindow = Window & {
  __POSTHOG_INITIALIZED__?: boolean
}

type EventProperties = Record<string, unknown>

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return
    const flaggedWindow =
      typeof window === 'undefined' ? undefined : (window as PostHogFlaggedWindow)

    if (flaggedWindow?.__POSTHOG_INITIALIZED__) return
    if ((posthog as { __loaded?: boolean }).__loaded) {
      if (flaggedWindow) flaggedWindow.__POSTHOG_INITIALIZED__ = true
      return
    }

    posthog.init(POSTHOG_KEY, {
      ...POSTHOG_CONFIG.initialization,
      api_host: POSTHOG_HOST,
      loaded: (ph) => {
        if (flaggedWindow) flaggedWindow.__POSTHOG_INITIALIZED__ = true
        if (process.env.NODE_ENV === 'development') {
          ph.debug()
          console.log('[PostHog] Initialized in development mode')
        }
      },
    })

    if (flaggedWindow) flaggedWindow.__POSTHOG_INITIALIZED__ = true
  }, [])

  if (!POSTHOG_KEY) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return

    const search = searchParams?.toString()
    const url = search ? `${pathname}?${search}` : pathname

    // ─── ADVANCED PAGE TRACKING ──────────────────────────────────────
    posthog.capture(POSTHOG_CONFIG.events.PAGE_VIEWED, {
      $current_url: url,
      $host: window.location.host,
      $pathname: pathname,
    })
  }, [pathname, searchParams])

  return null
}

/**
 * Advanced PostHog utilities for custom tracking
 */
export const posthogUtils = {
  /**
   * Identify a user with custom properties
   */
  identifyUser: (
    userId: string,
    properties?: EventProperties & { email?: string; name?: string }
  ) => {
    posthog.identify(userId, {
      email: properties?.email,
      name: properties?.name,
      ...properties,
    })
  },

  /**
   * Track custom events with properties
   */
  trackEvent: (eventName: string, properties?: EventProperties) => {
    posthog.capture(eventName, properties)
  },

  /**
   * Set user properties (e.g., subscription status, plan)
   */
  setUserProperties: (properties: EventProperties) => {
    posthog.setPersonProperties(properties)
  },

  /**
   * Check if a feature flag is enabled
   */
  isFeatureFlagEnabled: (flagName: string) => {
    return posthog.isFeatureEnabled(flagName)
  },

  /**
   * Get feature flag value
   */
  getFeatureFlagValue: (flagName: string) => {
    return posthog.getFeatureFlagPayload(flagName)
  },

  /**
   * Reset user identity (for logout)
   */
  reset: () => {
    posthog.reset()
  },
}
