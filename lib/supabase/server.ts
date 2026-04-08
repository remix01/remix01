import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { env } from '../env'

/**
 * Creates a Supabase client for server-side use with RLS enforced.
 * Uses the anon key - RLS policies apply.
 * 
 * IMPORTANT: Don't put this client in a global variable.
 * Always create a new client within each function.
 */
export async function createClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'development-anon-key'

  return createServerClientSSR<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

/**
 * Creates a Supabase admin client that bypasses Row Level Security.
 * Uses the service role key - USE WITH EXTREME CAUTION!
 * 
 * Only use for:
 * - Admin operations
 * - System-level tasks
 * - Background jobs
 * - Violation logging
 * 
 * NEVER expose this client to untrusted code or client-side.
 */
export function createAdminClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

// Export for compatibility with deprecated import patterns
export { createServerClientSSR as createServerClient }
export { createServerClientSSR }
