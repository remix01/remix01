'use server'

import { createClient } from '@/lib/supabase/server'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'

export async function ensureOAuthProfile(intendedRole: 'narocnik' | 'obrtnik') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return

  await canonicalWriteGateway.createOrUpdateProfile({
    id: user.id,
    role: intendedRole,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  }, 'auth.oauth.ensureProfile')

  if (intendedRole === 'obrtnik') {
    await canonicalWriteGateway.createOrUpdateProviderProfile({
      id: user.id,
      business_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        'Novi partner',
    }, 'auth.oauth.ensureProviderProfile')
  }
}
