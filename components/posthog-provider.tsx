'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
const POSTHOG_DEFAULTS = process.env.NEXT_PUBLIC_POSTHOG_DEFAULTS ?? '2026-01-30'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return

    if (posthog.isFeatureEnabled) {
      // Already initialized
      return
    }

    // ─── ADVANCED CONFIGURATION ──────────────────────────────────────────
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      
      // ─── Session & Identity ──────────────────────────────────────────
      person_profiles: 'identified_only', // Only identify users when explicitly set
      
      // ─── Page Tracking ───────────────────────────────────────────────
      capture_pageview: false, // Manual pageview tracking for better control
      capture_pageleave: true, // Track when users leave pages
      autocapture: true, // Auto-capture clicks, inputs, and form submissions
      
      // ─── Session Recording ───────────────────────────────────────────
      session_recording: {
        maskAllInputs: true, // Mask all input fields for privacy
        maskAllTextContent: true, // Mask text content
        recordCanvas: false, // Don't record canvas elements
        collectWindowPerformance: true, // Collect performance metrics
      },
      
      // ─── Feature Flags & Experiments ─────────────────────────────────
      feature_flags: {
        // Define feature flag handling
        loadFlags: true, // Load feature flags on initialization
      },
      
      // ─── Advanced Settings ───────────────────────────────────────────
      persistence: 'localStorage', // Persist data across sessions
      secure_cookie: true, // Use secure cookies for production
      cross_subdomain_cookie: true, // Share cookies across subdomains
      respect_dnt: true, // Respect Do Not Track browser setting
      
      // ─── Event Compression ───────────────────────────────────────────
      batch_events: true, // Batch events for better performance
      batch_size: 50, // Send events in batches of 50
      batch_timeout: 10000, // Or after 10 seconds
      
      // ─── Debug & Development ────────────────────────────────────────
      loaded: (ph: any) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug()
          console.log('[PostHog] Initialized in development mode')
        }
      },
    } as any)
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
    posthog.capture('$pageview', {
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
  identifyUser: (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, {
      email: properties?.email,
      name: properties?.name,
      ...properties,
    })
  },

  /**
   * Track custom events with properties
   */
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    posthog.capture(eventName, properties)
  },

  /**
   * Set user properties (e.g., subscription status, plan)
   */
  setUserProperties: (properties: Record<string, any>) => {
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
