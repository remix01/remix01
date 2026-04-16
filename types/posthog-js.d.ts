declare module 'posthog-js' {
  export interface PostHogConfig {
    api_host?: string
    person_profiles?: 'always' | 'never' | 'identified_only'
    capture_pageview?: boolean
    capture_pageleave?: boolean
    autocapture?: boolean
    loaded?: (posthog: PostHog) => void
  }

  export interface PostHog {
    init: (apiKey: string, config?: PostHogConfig) => void
    capture: (eventName: string, properties?: Record<string, unknown>) => void
    debug: (debug?: boolean) => void
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
}
