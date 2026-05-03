import { supabaseAdmin } from '@/lib/supabase-admin'

export type MinimalProfile = {
  id: string
  role: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

export async function getOrCreateProfile(user: { id: string; email?: string | null }): Promise<MinimalProfile | null> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle<MinimalProfile>()

  if (fetchError) {
    throw fetchError
  }

  if (existing) {
    return existing
  }

  const { error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? null,
      subscription_tier: 'start',
    })

  if (insertError && insertError.code !== '23505') {
    throw insertError
  }

  const { data: created, error: createdFetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle<MinimalProfile>()

  if (createdFetchError) {
    throw createdFetchError
  }

  return created
}

export function isProfileComplete(profile: MinimalProfile | null): boolean {
  if (!profile?.role) return false

  const hasFullName = !!profile.full_name?.trim()
  const hasSplitName = !!profile.first_name?.trim() || !!profile.last_name?.trim()
  return hasFullName || hasSplitName
}

