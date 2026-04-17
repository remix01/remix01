import { useCallback } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * Advanced hook for PostHog event tracking
 * Provides convenient methods for common tracking scenarios
 */
export const usePostHogEvents = () => {
  const posthog = usePostHog()

  // ─── USER IDENTIFICATION ────────────────────────────────────────────
  const identifyUser = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      posthog.identify(userId, {
        email: properties?.email,
        name: properties?.name,
        plan: properties?.plan,
        signupDate: properties?.signupDate,
        ...properties,
      })
    },
    [posthog]
  )

  // ─── AUTHENTICATION EVENTS ──────────────────────────────────────────
  const trackSignUp = useCallback(
    (properties?: Record<string, any>) => {
      posthog.capture('user_signup', {
        signup_method: properties?.method,
        email: properties?.email,
        ...properties,
      })
    },
    [posthog]
  )

  const trackLogin = useCallback(
    (properties?: Record<string, any>) => {
      posthog.capture('user_login', {
        login_method: properties?.method,
        email: properties?.email,
        ...properties,
      })
    },
    [posthog]
  )

  const trackLogout = useCallback(() => {
    posthog.capture('user_logout')
    posthog.reset()
  }, [posthog])

  // ─── FEATURE INTERACTION EVENTS ──────────────────────────────────────
  const trackFeatureView = useCallback(
    (featureName: string, properties?: Record<string, any>) => {
      posthog.capture('feature_viewed', {
        feature_name: featureName,
        ...properties,
      })
    },
    [posthog]
  )

  const trackFeatureInteraction = useCallback(
    (featureName: string, action: string, properties?: Record<string, any>) => {
      posthog.capture('feature_interaction', {
        feature_name: featureName,
        action,
        ...properties,
      })
    },
    [posthog]
  )

  // ─── SEARCH & DISCOVERY EVENTS ───────────────────────────────────────
  const trackSearch = useCallback(
    (query: string, properties?: Record<string, any>) => {
      posthog.capture('search_performed', {
        query,
        results_count: properties?.resultsCount,
        ...properties,
      })
    },
    [posthog]
  )

  // ─── ERROR TRACKING ──────────────────────────────────────────────────
  const trackError = useCallback(
    (errorName: string, errorMessage: string, properties?: Record<string, any>) => {
      posthog.capture('error_occurred', {
        error_name: errorName,
        error_message: errorMessage,
        stack_trace: properties?.stackTrace,
        ...properties,
      })
    },
    [posthog]
  )

  // ─── PERFORMANCE TRACKING ────────────────────────────────────────────
  const trackPageLoadTime = useCallback(
    (pageUrl: string, loadTime: number) => {
      posthog.capture('page_load_performance', {
        page_url: pageUrl,
        load_time_ms: loadTime,
      })
    },
    [posthog]
  )

  // ─── CONVERSION EVENTS ───────────────────────────────────────────────
  const trackConversion = useCallback(
    (conversionType: string, properties?: Record<string, any>) => {
      posthog.capture('conversion', {
        conversion_type: conversionType,
        ...properties,
      })
    },
    [posthog]
  )

  // ─── CUSTOM EVENT TRACKING ──────────────────────────────────────────
  const trackCustomEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      posthog.capture(eventName, properties)
    },
    [posthog]
  )

  // ─── USER PROPERTIES ────────────────────────────────────────────────
  const setUserProperties = useCallback(
    (properties: Record<string, any>) => {
      posthog.setPersonProperties(properties)
    },
    [posthog]
  )

  // ─── FEATURE FLAGS ───────────────────────────────────────────────────
  const isFeatureFlagEnabled = useCallback(
    (flagName: string) => {
      return posthog.isFeatureEnabled(flagName)
    },
    [posthog]
  )

  const getFeatureFlagValue = useCallback(
    (flagName: string) => {
      return posthog.getFeatureFlagPayload(flagName)
    },
    [posthog]
  )

  return {
    // User identification
    identifyUser,
    setUserProperties,
    
    // Authentication
    trackSignUp,
    trackLogin,
    trackLogout,
    
    // Feature tracking
    trackFeatureView,
    trackFeatureInteraction,
    
    // Discovery
    trackSearch,
    
    // Error tracking
    trackError,
    
    // Performance
    trackPageLoadTime,
    
    // Conversions
    trackConversion,
    
    // Custom
    trackCustomEvent,
    
    // Feature flags
    isFeatureFlagEnabled,
    getFeatureFlagValue,
  }
}
