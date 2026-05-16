'use client'

/**
 * Client-side feature flag hook.
 * Reads PostHog runtime evaluation with env-var override support.
 *
 * Falls back to false while PostHog initializes (avoids flash of wrong content).
 *
 * @example
 *   const videoEnabled = useFeatureFlag('video_diagnosis')
 *   const quotesEnabled = useFeatureFlagKey('AI_QUOTE_GENERATOR')
 */

import { usePostHog } from 'posthog-js/react'
import type { FlagKey, FlagValue } from '@/lib/feature-flags'
import { FLAGS } from '@/lib/feature-flags'

export function useFeatureFlag(flag: FlagValue): boolean {
  const posthog = usePostHog()

  // Public env override: NEXT_PUBLIC_FEATURE_AI_QUOTE_GENERATOR=1
  const envKey = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const envVal = (process as any).env?.[envKey] as string | undefined
  if (envVal !== undefined) {
    return envVal === '1' || envVal === 'true'
  }

  if (!posthog) return false
  return posthog.isFeatureEnabled(flag) ?? false
}

export function useFeatureFlagKey(key: FlagKey): boolean {
  return useFeatureFlag(FLAGS[key])
}
