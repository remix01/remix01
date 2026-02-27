import { z } from 'zod'

const envSchema = z.object({
  // ─── REQUIRED — app cannot function without these ───
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // ─── OPTIONAL — features degrade gracefully if missing ───
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().optional().default('https://liftgo.net'),

  ADMIN_ALERT_EMAIL: z.string().optional(),

  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missing = Object.entries(result.error.flatten().fieldErrors)
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join('\n')

    // Only REQUIRED vars cause a hard crash
    const requiredMissing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
      .filter(k => !process.env[k])

    if (requiredMissing.length > 0) {
      throw new Error(
        `Missing REQUIRED environment variables:\n${requiredMissing.map(k => `  - ${k}`).join('\n')}`
      )
    }

    // Optional vars just warn
    console.warn('[env] Some optional environment variables are missing:\n' + missing)
  }

  return result.data ?? ({} as z.infer<typeof envSchema>)
}

export const env = validateEnv()

// Helper functions — check before using optional features
export const hasStripe = () => !!env.STRIPE_SECRET_KEY
export const hasQStash = () => !!env.QSTASH_TOKEN
export const hasLangfuse = () => !!env.LANGFUSE_SECRET_KEY
export const hasAdminEmail = () => !!env.ADMIN_ALERT_EMAIL
