import 'server-only'

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Supabase admin client with service_role key.
 * Bypasses RLS - use only in server-side code.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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
  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return admin
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
