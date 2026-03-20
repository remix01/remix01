// ─── NO ZOD VALIDATION ───
// Simply map process.env with safe defaults. No crashes, no spam.

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  QSTASH_TOKEN: process.env.QSTASH_TOKEN ?? '',
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'https://liftgo.net',
  ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL ?? '',
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY ?? '',
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY ?? '',
  LANGFUSE_HOST: process.env.LANGFUSE_HOST ?? '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID ?? '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? '',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? '',
  // Alerts & notifications
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ?? '',
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ?? '',
  SLACK_CHANNEL_ALERTS: process.env.SLACK_CHANNEL_ALERTS ?? '#liftgo-alerts',
  SLACK_CHANNEL_BUSINESS: process.env.SLACK_CHANNEL_BUSINESS ?? '#liftgo-narocila',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',
  // Cron job protection
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'production',
} as const

// Helper functions — check before using optional features
export const hasStripe = () => !!env.STRIPE_SECRET_KEY
export const hasQStash = () => !!env.QSTASH_TOKEN
export const hasLangfuse = () => !!env.LANGFUSE_SECRET_KEY
export const hasAdminEmail = () => !!env.ADMIN_ALERT_EMAIL
export const hasAnthropicAI = () => !!env.ANTHROPIC_API_KEY
export const hasSlack = () => !!env.SLACK_WEBHOOK_URL
export const hasResend = () => !!env.RESEND_API_KEY
export const hasSlackBot = () => !!env.SLACK_BOT_TOKEN
