import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase client for browser/client-side use.
 * Uses the anon key - RLS policies are enforced.
 * 
 * Safe to use in client components and React hooks.
 * Users can only access data allowed by RLS policies.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
