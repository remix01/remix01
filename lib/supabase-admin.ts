import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { env } from './env'

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
  // Log loudly so Vercel runtime logs surface the misconfiguration immediately.
  console.error(
    '[supabase-admin] NEXT_PUBLIC_SUPABASE_URL is missing or not a supabase.co URL.',
    { value: supabaseUrl || '(empty)' }
  )
}

if (!serviceRoleKey) {
  console.error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set.')
}

/**
 * Supabase admin client with service_role key.
 * Bypasses RLS - use only in server-side code.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'http://localhost:54321',
  serviceRoleKey || 'development-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Helper: verify admin from request
export async function verifyAdmin(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: adminByAuthUserId } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()

  return adminByAuthUserId
}

// Helper: log admin action
export async function logAction(
  adminId: string,
  akcija: string,
  tabela: string,
  zapisId: string,
  staroStanje?: object,
  novoStanje?: object
) {
  await supabaseAdmin.from('admin_log').insert({
    admin_id: adminId,
    akcija,
    tabela,
    zapis_id: zapisId,
    staro_stanje: staroStanje,
    novo_stanje: novoStanje,
  })
}
