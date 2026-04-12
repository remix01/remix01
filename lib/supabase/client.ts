import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { env } from '../env'

/**
 * Creates a Supabase client for browser/client-side use.
 * Uses the anon key - RLS policies are enforced.
 * 
 * Safe to use in client components and React hooks.
 * Users can only access data allowed by RLS policies.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  try {
    if (browserClient) return browserClient
    // Check if required env vars exist
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('[v0] Supabase environment variables not configured')
      return null as any
    }

    browserClient = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    return browserClient
  } catch (error) {
    console.error('[v0] Failed to create Supabase client:', error)
    return null as any
  }
}

