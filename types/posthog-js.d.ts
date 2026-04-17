declare module 'posthog-js' {
  export interface SessionRecordingConfig {
    maskAllInputs?: boolean
    maskAllTextContent?: boolean
    recordCanvas?: boolean
    collectWindowPerformance?: boolean
  }

  export interface FeatureFlagsConfig {
    loadFlags?: boolean
  }

  export interface PostHogConfig {
    api_host?: string
    person_profiles?: 'always' | 'never' | 'identified_only'
    capture_pageview?: boolean
    capture_pageleave?: boolean
    autocapture?: boolean | Record<string, any>
    session_recording?: boolean | SessionRecordingConfig
    feature_flags?: FeatureFlagsConfig
    persistence?: 'localStorage' | 'sessionStorage' | 'memory'
    secure_cookie?: boolean
    cross_subdomain_cookie?: boolean
    respect_dnt?: boolean
    batch_events?: boolean
    batch_size?: number
    batch_timeout?: number
    loaded?: (posthog: PostHog) => void
  }

  export interface PostHog {
    init: (apiKey: string, config?: PostHogConfig) => void
    capture: (eventName: string, properties?: Record<string, unknown>) => void
    identify: (userId: string, properties?: Record<string, any>) => void
    setPersonProperties: (properties: Record<string, any>) => void
    isFeatureEnabled: (flagName: string) => boolean | undefined
    getFeatureFlagPayload: (flagName: string) => any
    debug: (debug?: boolean) => void
    reset: () => void
  }

  const posthog: PostHog
  export default posthog
}

declare module 'posthog-js/react' {
  import type { ReactNode } from 'react'
  import type { PostHog } from 'posthog-js'

  export function PostHogProvider(props: {
    client: PostHog
    children: ReactNode
  }): JSX.Element
  
  export function usePostHog(): PostHog
  export function useFeatureFlagVariantKey(flagName: string): string | null
}
