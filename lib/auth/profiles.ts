import 'server-only'

import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'

export type AuthProfile = {
  id: string
  role: string | null
  full_name?: string | null
  subscription_tier?: 'start' | 'pro' | 'elite' | null
}

async function getProviderProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getProfileByUserId<T extends string = 'id, role'>(
  userId: string,
  select: T = 'id, role' as T,
) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function ensureCustomerProfile(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  writeSource = 'auth.ensureCustomerProfile',
) {
  const existing = await getProfileByUserId(user.id, 'id, role, full_name, subscription_tier')

  if (existing?.role) {
    return existing as AuthProfile
  }

  // If this auth user already has a provider profile, preserve/backfill the
  // obrtnik role instead of accidentally treating them as a customer.
  const providerProfile = await getProviderProfile(user.id)
  if (providerProfile) {
    return canonicalWriteGateway.createOrUpdateProfile(
      {
        ...(existing ?? {}),
        id: user.id,
        role: 'obrtnik',
        email: user.email ?? null,
        full_name:
          existing?.full_name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split('@')[0] ??
          null,
      },
      `${writeSource}.providerRoleBackfill`,
    ) as Promise<AuthProfile>
  }

  if (existing) {
    return existing as AuthProfile
  }

  return canonicalWriteGateway.createOrUpdateProfile(
    {
      id: user.id,
      role: 'narocnik',
      email: user.email ?? null,
      full_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        null,
    },
    writeSource,
  ) as Promise<AuthProfile>
}
