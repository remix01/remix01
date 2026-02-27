import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_PLATFORM_COMMISSION_PCT: z.string().optional(),

  // QStash (job queue)
  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_URL: z.string().url().optional(),
  NEXT_PUBLIC_FROM_EMAIL: z.string().email().optional(),
  ADMIN_EMAIL: z.string().email().optional(),

  // Web Push
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Google Calendar
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_CONVERSATIONS_SERVICE_SID: z.string().optional(),
  TWILIO_PROXY_NUMBERS: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),

  // Build/Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.warn('[v0] Some environment variables are missing:')
    console.warn(result.error.flatten().fieldErrors)
    // In production: throw to prevent startup with missing config
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables')
    }
    // In development: return partial object to avoid crashes
  }
  // Return what we have, with defaults for missing vars
  return result.data ?? ({} as Partial<z.infer<typeof envSchema>>)
}

export const env = validateEnv()
