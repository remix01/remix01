import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin as requireAdminContext, type AdminRole } from '@/lib/admin-auth'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  return user
}

export async function requireAdmin(allowedRoles?: AdminRole[]) {
  await requireAdminContext(allowedRoles)
  return requireUser()
}
