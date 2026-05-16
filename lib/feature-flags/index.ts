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
 *
 * ─── FEATURE STATUS REGISTRY ────────────────────────────────────────────────
 *
 * Feature               | Status      | Flag                  | Notes
 * ----------------------|-------------|------------------------|-------------------------------
 * Email notifications   | active      | —                      | Resend wired, worker live
 * Payment service       | active      | —                      | saga steps implemented
 * Realtime messaging    | active      | realtime_messaging     | Supabase channels, DAL ready
 * AI quote generator    | planned     | ai_quote_generator     | PRO, agent skeleton exists
 * AI materials agent    | planned     | ai_materials_agent     | PRO, not implemented
 * Video diagnosis       | planned     | video_diagnosis        | PRO, upload UI stub only
 * Job summary AI        | planned     | job_summary_ai         | PRO, not implemented
 * Offer comparison AI   | active      | offer_comparison_ai    | START+, agent exists
 * Scheduling assistant  | active      | scheduling_assistant   | START+, agent exists
 * Instant offers        | planned     | instant_offers         | marketplace_events table TODO
 * Portfolio upload      | planned     | portfolio_upload        | DAL ready, UI not wired
 * Obrtnik analytics     | planned     | obrtnik_analytics      | PRO, PostHog only for now
 * AI insights subscriber| planned     | FEATURE_AI_INSIGHTS=1  | ALL handlers are stubs — off by default
 * Push notifications    | planned     | —                      | VAPID not implemented
 * Promo banner          | planned     | promo_banner           | off by default
 * New onboarding flow   | planned     | new_onboarding_flow    | A/B test, off by default
 *
 * deprecated: nothing currently deprecated (legacy routes are temporary redirects, not deprecated features)
 * remove: no features scheduled for removal this sprint
 * ────────────────────────────────────────────────────────────────────────────
 */

import { POSTHOG_CONFIG } from '@/lib/posthog/config'

export const FLAGS = POSTHOG_CONFIG.featureFlags

export type FlagKey = keyof typeof FLAGS
export type FlagValue = (typeof FLAGS)[FlagKey]

/** Which flags are on by default in production (without PostHog override) */
const PLATFORM_DEFAULTS: Record<FlagValue, boolean> = {
  ai_quote_generator:    false, // planned — PRO only
  ai_materials_agent:    false, // planned — PRO only
  video_diagnosis:       false, // planned — PRO only, upload UI stub
  job_summary_ai:        false, // planned — PRO only
  offer_comparison_ai:   true,  // active  — START+
  scheduling_assistant:  true,  // active  — START+
  instant_offers:        false, // planned — marketplace_events table needed
  realtime_messaging:    true,  // active  — Supabase channels live
  portfolio_upload:      false, // planned — DAL ready, UI not wired
  obrtnik_analytics:     false, // planned — PRO only
  promo_banner:          false, // planned
  new_onboarding_flow:   false, // planned — A/B test
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
