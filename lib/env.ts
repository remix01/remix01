export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER ?? 'supabase') as 'minio' | 'supabase',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? 'http://minio:9000',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? '',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? '',
  MINIO_REGION: process.env.MINIO_REGION ?? 'us-east-1',
  MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL ?? process.env.MINIO_ENDPOINT ?? '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '',
  STRIPE_WEBHOOK_SECRETS: process.env.STRIPE_WEBHOOK_SECRETS ?? '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',

  QSTASH_TOKEN: process.env.QSTASH_TOKEN ?? '',
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '',

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY ?? '',
  BRAVE_API_KEY: process.env.BRAVE_API_KEY ?? '',
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY ?? '',
  E2B_API_KEY: process.env.E2B_API_KEY ?? '',
  AI_FEATURE_ENABLED: process.env.AI_FEATURE_ENABLED ?? 'false',

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
  OBSERVABILITY_REQUIRED: process.env.OBSERVABILITY_REQUIRED ?? 'false',

  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? '',
  FROM_EMAIL: process.env.FROM_EMAIL ?? '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? '',
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? '',
  DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL ?? '',
  RESEND_FROM: process.env.RESEND_FROM ?? '',

  EMAIL_DEV_REDIRECT_TO: process.env.EMAIL_DEV_REDIRECT_TO ?? '',
  EMAIL_ALLOWED_RECIPIENTS: process.env.EMAIL_ALLOWED_RECIPIENTS ?? '',
  ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL ?? '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',

  VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? '',

  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ?? '',
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ?? '',

  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID ?? '',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  EMBEDDING_BACKFILL_MAX_PER_RUN: process.env.EMBEDDING_BACKFILL_MAX_PER_RUN ?? '10',

  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'https://liftgo.net',
  APP_BASE_URL: process.env.APP_BASE_URL ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'production',
} as const

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function requireEnv(key: keyof typeof env, reason?: string): string {
  const value = env[key]
  if (value && value.trim().length > 0) return value
  throw new Error(`[ENV] Missing required env: ${key}${reason ? ` (${reason})` : ''}`)
}

const FEATURE_ENV_REQUIREMENTS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_CONNECT_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  notifications: ['EMAIL_PROVIDER', 'FROM_EMAIL'],
  ai: ['AI_PROVIDER_KEY'],
  observability: ['SENTRY_DSN'],
  app: ['NEXT_PUBLIC_APP_URL'],
} as const

type FeatureName = keyof typeof FEATURE_ENV_REQUIREMENTS

export function requireFeatureEnv(feature: FeatureName): void {
  const missing = getFeatureMissing(feature)
  if (missing.length > 0) {
    throw new Error(`[ENV] Missing required ${feature} env: ${missing.join(', ')}`)
  }
}

function getFeatureMissing(feature: FeatureName): string[] {
  if (feature === 'ai') {
    return hasAnyAI() ? [] : [...FEATURE_ENV_REQUIREMENTS.ai]
  }
  if (feature === 'notifications') {
    const provider = env.EMAIL_PROVIDER.trim().toLowerCase()
    const baseMissing: string[] = []
    if (!provider) baseMissing.push('EMAIL_PROVIDER')
    if (!env.FROM_EMAIL && !env.EMAIL_FROM && !env.DEFAULT_FROM_EMAIL && !env.RESEND_FROM) {
      baseMissing.push('FROM_EMAIL|EMAIL_FROM|DEFAULT_FROM_EMAIL|RESEND_FROM')
    }
    if (provider === 'resend' && !env.RESEND_API_KEY) baseMissing.push('RESEND_API_KEY')
    if (provider === 'sendgrid' && !env.SENDGRID_API_KEY) baseMissing.push('SENDGRID_API_KEY')
    return baseMissing
  }

  const keys = FEATURE_ENV_REQUIREMENTS[feature] as readonly string[]
  return keys.filter((k) => !(process.env[k] ?? '').trim())
}

export function getReadinessReport() {
  const requiredFeatures: FeatureName[] = ['supabase', 'stripe', 'notifications', 'app']
  const optionalFeatures: FeatureName[] = []
  if (env.AI_FEATURE_ENABLED === 'true') requiredFeatures.push('ai')
  else optionalFeatures.push('ai')
  if (env.OBSERVABILITY_REQUIRED === 'true') requiredFeatures.push('observability')
  else optionalFeatures.push('observability')

  const required = requiredFeatures.map((feature) => ({ feature, missing: getFeatureMissing(feature) }))
  const optional = optionalFeatures.map((feature) => ({ feature, missing: getFeatureMissing(feature) }))

  const hasBlockingIssues = required.some((r) => r.missing.length > 0)

  const appUrlInvalid = !isValidHttpUrl(env.NEXT_PUBLIC_APP_URL)
  const invalidRules = appUrlInvalid ? ['NEXT_PUBLIC_APP_URL must be valid http(s) URL'] : []

  return {
    environment: env.NODE_ENV,
    liveness: { ok: true },
    readiness: {
      ok: !hasBlockingIssues && invalidRules.length === 0,
      required,
      invalidRules,
    },
    degraded: {
      optional,
    },
  }
}

export function assertProductionConfig(): void {
  if (!isProduction()) return
  const report = getReadinessReport()
  if (!report.readiness.ok) {
    throw new Error('[ENV] Production readiness failed due to missing critical configuration')
  }
}

export function assertQStashProductionEnv(): void {
  if (!isProduction()) return
  for (const key of ['QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY'] as const) {
    requireEnv(key)
  }
  if (!isValidHttpUrl(requireEnv('NEXT_PUBLIC_APP_URL'))) {
    throw new Error('[ENV] NEXT_PUBLIC_APP_URL must be a valid http(s) URL in production')
  }
}

export function assertEnv() {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
}

export const hasAnyAI = () => !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.PERPLEXITY_API_KEY)

export const hasStripe = () => !!env.STRIPE_SECRET_KEY
export const hasQStash = () => !!env.QSTASH_TOKEN
export const hasUpstash = () => !!env.UPSTASH_REDIS_REST_URL
export const hasResend = () => !!env.RESEND_API_KEY
export const hasSlack = () => !!(process.env.SLACK_WEBHOOK_URL ?? '')
export const hasSlackBot = () => !!(process.env.SLACK_BOT_TOKEN ?? '')
export const hasTwilio = () => !!(process.env.TWILIO_ACCOUNT_SID ?? '')
export const hasGoogleMaps = () => !!(process.env.GOOGLE_MAPS_API_KEY ?? '')
export const hasGoogleSearch = () => !!(process.env.GOOGLE_SEARCH_ENGINE_ID ?? '')
export const hasGoogleProject = () => !!(process.env.GOOGLE_PROJECT_ID ?? '')
export const hasAdvancedGoogle = () => hasGoogleMaps() && hasGoogleSearch() && hasGoogleProject()
export const hasAnthropicAI = () => !!env.ANTHROPIC_API_KEY
export const hasOpenAI = () => !!env.OPENAI_API_KEY
export const hasGemini = () => !!env.GEMINI_API_KEY
export const hasPerplexity = () => !!env.PERPLEXITY_API_KEY
export const hasBraveSearch = () => !!env.BRAVE_API_KEY
export const hasVoyageAPI = () => !!env.VOYAGE_API_KEY
export const hasE2B = () => !!env.E2B_API_KEY
export const hasEmbeddings = () => hasOpenAI() || hasVoyageAPI() || hasGemini()
export const hasLangfuse = () => !!env.LANGFUSE_SECRET_KEY
export const hasLangSmith = () => env.LANGSMITH_TRACING === 'true' && !!env.LANGSMITH_ENDPOINT && !!env.LANGSMITH_API_KEY
export const hasSentry = () => !!(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN)
export const hasPostHog = () => !!(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '')
export const hasAdminEmail = () => !!(process.env.ADMIN_ALERT_EMAIL ?? '')

export type AIProvider = 'anthropic' | 'openai' | 'voyage' | 'gemini' | 'perplexity'
export function getAvailableAIProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (hasAnthropicAI()) providers.push('anthropic')
  if (hasOpenAI()) providers.push('openai')
  if (hasVoyageAPI()) providers.push('voyage')
  if (hasGemini()) providers.push('gemini')
  if (hasPerplexity()) providers.push('perplexity')
  return providers
}
export function getBestProviderFor(task: 'chat' | 'embedding' | 'search' | 'vision'): AIProvider | null {
  if (task === 'chat') return hasAnthropicAI() ? 'anthropic' : hasOpenAI() ? 'openai' : hasGemini() ? 'gemini' : null
  if (task === 'embedding') return hasOpenAI() ? 'openai' : hasVoyageAPI() ? 'voyage' : hasGemini() ? 'gemini' : null
  if (task === 'search') return hasPerplexity() ? 'perplexity' : hasOpenAI() ? 'openai' : null
  return hasAnthropicAI() ? 'anthropic' : hasOpenAI() ? 'openai' : hasGemini() ? 'gemini' : null
}
