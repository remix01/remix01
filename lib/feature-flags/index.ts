/**
 * Feature Flags — server-side evaluation
 *
 * Priority order:
 * 1. FEATURE_<FLAG> env var override (deploy-time override, useful for staging)
 * 2. NEXT_PUBLIC_FEATURE_<FLAG> env var (public override, visible to client)
 * 3. Plan-based defaults (PRO features require PRO subscription)
 * 4. Platform defaults defined below
 *
 * Flag keys mirror POSTHOG_CONFIG.featureFlags for consistency.
 * PostHog evaluates the same keys at runtime for A/B testing and gradual rollouts.
 */

import { POSTHOG_CONFIG } from '@/lib/posthog/config'

export const FLAGS = POSTHOG_CONFIG.featureFlags

export type FlagKey = keyof typeof FLAGS
export type FlagValue = (typeof FLAGS)[FlagKey]

/** Which flags are on by default in production (without PostHog override) */
const PLATFORM_DEFAULTS: Record<FlagValue, boolean> = {
  ai_quote_generator:    false, // PRO only
  ai_materials_agent:    false, // PRO only
  video_diagnosis:       false, // PRO only
  job_summary_ai:        false, // PRO only
  offer_comparison_ai:   true,  // START+
  scheduling_assistant:  true,  // START+
  instant_offers:        false, // beta
  realtime_messaging:    true,
  portfolio_upload:      false, // beta
  obrtnik_analytics:     false, // PRO only
  promo_banner:          false,
  new_onboarding_flow:   false,
}

/** Flags that require PRO subscription tier */
const PRO_FLAGS: ReadonlySet<FlagValue> = new Set([
  'ai_quote_generator',
  'ai_materials_agent',
  'video_diagnosis',
  'job_summary_ai',
  'obrtnik_analytics',
])

/**
 * Server-side feature flag check.
 * Call from Server Components, API routes, and server actions.
 *
 * @param flag - Flag key from FLAGS constant
 * @param plan - User's subscription plan (optional, used for PRO gate)
 */
export function isEnabled(flag: FlagValue, plan?: 'START' | 'PRO'): boolean {
  // Env override: FEATURE_AI_QUOTE_GENERATOR=1 or =true
  const envKey = `FEATURE_${flag.toUpperCase()}`
  const envVal = process.env[envKey]
  if (envVal !== undefined) {
    return envVal === '1' || envVal === 'true'
  }

  // PRO gate: if flag requires PRO and user is on START, deny
  if (PRO_FLAGS.has(flag) && plan !== 'PRO') {
    return false
  }

  return PLATFORM_DEFAULTS[flag] ?? false
}

/**
 * Check if a named feature flag key is enabled.
 * Convenience wrapper using the FLAGS constant.
 *
 * @example
 *   if (isFlagEnabled('VIDEO_DIAGNOSIS', user.plan)) { ... }
 */
export function isFlagEnabled(key: FlagKey, plan?: 'START' | 'PRO'): boolean {
  return isEnabled(FLAGS[key], plan)
}

export { PRO_FLAGS }
