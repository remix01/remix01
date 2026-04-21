// ═══ NO ZOD VALIDATION ═══
// Simply map process.env with safe defaults. No crashes, no spam.

export const env = {
  // ─── Supabase ───
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  // ─── Stripe ───
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '',
  // Optional comma-separated list for rotated/multi-endpoint webhook secrets.
  // Example: "whsec_old,whsec_new,whsec_connect"
  STRIPE_WEBHOOK_SECRETS: process.env.STRIPE_WEBHOOK_SECRETS ?? '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',

  // ─── Upstash / QStash ───
  QSTASH_TOKEN: process.env.QSTASH_TOKEN ?? '',
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',

  // ─── AI Providers ───
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY ?? '',
  BRAVE_API_KEY: process.env.BRAVE_API_KEY ?? '',
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY ?? '',

  // ─── Observability ───
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY ?? '',
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY ?? '',
  LANGFUSE_HOST: process.env.LANGFUSE_HOST ?? '',
  LANGSMITH_TRACING: process.env.LANGSMITH_TRACING ?? 'false',
  LANGSMITH_ENDPOINT: process.env.LANGSMITH_ENDPOINT ?? '',
  LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY ?? '',
  LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT ?? '',
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  SENTRY_RELEASE: process.env.SENTRY_RELEASE ?? '',
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
  NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? '',
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  NEXT_PUBLIC_POSTHOG_DEFAULTS: process.env.NEXT_PUBLIC_POSTHOG_DEFAULTS ?? '2026-01-30',

  // ─── Email & Notifications ───
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL ?? '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',

  // ─── Push Notifications (VAPID) ───
  VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? '',

  // ─── Slack ───
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ?? '',
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ?? '',
  SLACK_CHANNEL_ALERTS: process.env.SLACK_CHANNEL_ALERTS ?? '#liftgo-alerts',
  SLACK_CHANNEL_BUSINESS: process.env.SLACK_CHANNEL_BUSINESS ?? '#liftgo-narocila',

  // ─── Twilio (Voice AI) ───
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ?? '',


  // ─── Google Cloud / Search / Maps ───
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ?? '',
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ?? '',

  // ─── App Config ───
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'https://liftgo.net',
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID ?? '',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  EMBEDDING_BACKFILL_MAX_PER_RUN: process.env.EMBEDDING_BACKFILL_MAX_PER_RUN ?? '10',
  NODE_ENV: process.env.NODE_ENV ?? 'production',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Helper functions – check before using optional features
// ═══════════════════════════════════════════════════════════════════════════

// Core services
export const hasStripe = () => !!env.STRIPE_SECRET_KEY
export const hasQStash = () => !!env.QSTASH_TOKEN
export const hasUpstash = () => !!env.UPSTASH_REDIS_REST_URL
export const hasResend = () => !!env.RESEND_API_KEY
export const hasSlack = () => !!env.SLACK_WEBHOOK_URL
export const hasSlackBot = () => !!env.SLACK_BOT_TOKEN
export const hasTwilio = () => !!env.TWILIO_ACCOUNT_SID


// Google Cloud integrations
export const hasGoogleMaps = () => !!env.GOOGLE_MAPS_API_KEY
export const hasGoogleSearch = () => !!env.GOOGLE_SEARCH_ENGINE_ID
export const hasGoogleProject = () => !!env.GOOGLE_PROJECT_ID
export const hasAdvancedGoogle = () =>
  hasGoogleMaps() && hasGoogleSearch() && hasGoogleProject()

// AI Providers
export const hasAnthropicAI = () => !!env.ANTHROPIC_API_KEY
export const hasOpenAI = () => !!env.OPENAI_API_KEY
export const hasGemini = () => !!env.GEMINI_API_KEY
export const hasPerplexity = () => !!env.PERPLEXITY_API_KEY
export const hasBraveSearch = () => !!env.BRAVE_API_KEY
export const hasVoyageAPI = () => !!env.VOYAGE_API_KEY

// Check if ANY AI provider is available
export const hasAnyAI = () =>
  hasAnthropicAI() || hasOpenAI() || hasGemini() || hasPerplexity()

// Check if embeddings are possible (OpenAI or Voyage)
export const hasEmbeddings = () => hasOpenAI() || hasVoyageAPI() || hasGemini()

// Observability
export const hasLangfuse = () => !!env.LANGFUSE_SECRET_KEY
export const hasLangSmith = () =>
  env.LANGSMITH_TRACING === 'true' && !!env.LANGSMITH_ENDPOINT && !!env.LANGSMITH_API_KEY
export const hasSentry = () => !!(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN)
export const hasPostHog = () => !!env.NEXT_PUBLIC_POSTHOG_KEY
export const hasAdminEmail = () => !!env.ADMIN_ALERT_EMAIL

// ═══════════════════════════════════════════════════════════════════════════
// AI Provider Priority Lists
// ═══════════════════════════════════════════════════════════════════════════

export type AIProvider = 'anthropic' | 'openai' | 'voyage' | 'gemini' | 'perplexity'

/**
 * Get list of available AI providers in priority order
 */
export function getAvailableAIProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (hasAnthropicAI()) providers.push('anthropic')
  if (hasOpenAI()) providers.push('openai')
  if (hasVoyageAPI()) providers.push('voyage')
  if (hasGemini()) providers.push('gemini')
  if (hasPerplexity()) providers.push('perplexity')
  return providers
}

/**
 * Get best available provider for a task type
 */
export function getBestProviderFor(
  task: 'chat' | 'embedding' | 'search' | 'vision'
): AIProvider | null {
  switch (task) {
    case 'chat':
      // Anthropic > OpenAI > Gemini for chat
      if (hasAnthropicAI()) return 'anthropic'
      if (hasOpenAI()) return 'openai'
      if (hasGemini()) return 'gemini'
      return null

    case 'embedding':
      // OpenAI > Voyage > Gemini for embeddings (Anthropic doesn't have embeddings)
      if (hasOpenAI()) return 'openai'
      if (hasVoyageAPI()) return 'voyage'
      if (hasGemini()) return 'gemini'
      return null

    case 'search':
      // Perplexity > OpenAI for search
      if (hasPerplexity()) return 'perplexity'
      if (hasOpenAI()) return 'openai'
      return null

    case 'vision':
      // Anthropic > OpenAI > Gemini for vision
      if (hasAnthropicAI()) return 'anthropic'
      if (hasOpenAI()) return 'openai'
      if (hasGemini()) return 'gemini'
      return null

    default:
      return null
  }
}
