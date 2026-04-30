import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Supabase admin client with service_role key.
 * Bypasses RLS - use only in server-side code.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key',
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
