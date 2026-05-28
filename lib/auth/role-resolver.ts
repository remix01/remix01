import 'server-only'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createAdminClient } from '@/lib/supabase/server'

export type ResolvedAuthRole = 'admin' | 'obrtnik' | 'narocnik' | 'unknown'

export interface ResolvedAuthState {
  user: User
  role: ResolvedAuthRole
  hasProfile: boolean
  profileRole: 'obrtnik' | 'narocnik' | null
  isAdmin: boolean
  hasObrtnikProfile: boolean
  usedLegacyObrtnikUserId: boolean
}

export async function resolveAuthState(user: User): Promise<ResolvedAuthState> {
  const adminClient = createAdminClient()

  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()

  if (adminUser) {
    return {
      user,
      role: 'admin',
      hasProfile: true,
      profileRole: null,
      isAdmin: true,
      hasObrtnikProfile: false,
      usedLegacyObrtnikUserId: false,
    }
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  const profileRole = profile?.role === 'obrtnik' || profile?.role === 'narocnik' ? profile.role : null

  if (!profile) {
    return {
      user,
      role: 'unknown',
      hasProfile: false,
      profileRole: null,
      isAdmin: false,
      hasObrtnikProfile: false,
      usedLegacyObrtnikUserId: false,
    }
  }

  if (profileRole === 'obrtnik') {
    return {
      user,
      role: 'obrtnik',
      hasProfile: true,
      profileRole,
      isAdmin: false,
      hasObrtnikProfile: true,
      usedLegacyObrtnikUserId: false,
    }
  }

  if (profileRole === 'narocnik') {
    return {
      user,
      role: 'narocnik',
      hasProfile: true,
      profileRole,
      isAdmin: false,
      hasObrtnikProfile: false,
      usedLegacyObrtnikUserId: false,
    }
  }

  const { data: obrtnikById } = await adminClient
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (obrtnikById) {
    return {
      user,
      role: 'obrtnik',
      hasProfile: true,
      profileRole: null,
      isAdmin: false,
      hasObrtnikProfile: true,
      usedLegacyObrtnikUserId: false,
    }
  }

  const { data: obrtnikByUserId } = await (adminClient as any)
    .from('obrtnik_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (obrtnikByUserId) {
    return {
      user,
      role: 'obrtnik',
      hasProfile: true,
      profileRole: null,
      isAdmin: false,
      hasObrtnikProfile: true,
      usedLegacyObrtnikUserId: true,
    }
  }

  return {
    user,
    role: 'narocnik',
    hasProfile: true,
    profileRole: null,
    isAdmin: false,
    hasObrtnikProfile: false,
    usedLegacyObrtnikUserId: false,
  }
}

export async function resolveAuthStateFromSessionClient(
  supabase: SupabaseClient<Database>,
): Promise<ResolvedAuthState | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  return resolveAuthState(user)
}
