import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type AdminRole = 'super_admin' | 'support' | 'finance'

const ROLE_MAP: Record<string, AdminRole> = {
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'support',
  OPERATER: 'support',
  FINANCE: 'finance',
}

export interface AdminContext {
  userId: string
  role: AdminRole
  adminUserId: string
}

export class AdminAuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
  status: 401 | 403

  constructor(code: 'UNAUTHORIZED' | 'FORBIDDEN') {
    super(code)
    this.code = code
    this.status = code === 'UNAUTHORIZED' ? 401 : 403
  }
}

export function toAdminAuthFailure(error: unknown): {
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
  status: 401 | 403
  message: string
} {
  if (error instanceof AdminAuthError) {
    return {
      code: error.code,
      status: error.status,
      message: error.status === 401 ? 'Unauthorized' : 'Forbidden',
    }
  }

  return {
    code: 'FORBIDDEN',
    status: 403,
    message: 'Forbidden',
  }
}

export async function requireAdmin(allowedRoles?: AdminRole[]): Promise<AdminContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new AdminAuthError('UNAUTHORIZED')
  }

  const jwtRole = String(user.app_metadata?.role || '').toLowerCase()

  const { data: adminByAuthUserId, error: adminByAuthUserIdError } = await supabaseAdmin
    .from('admin_users')
    .select('id, vloga, aktiven')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()

  if (adminByAuthUserIdError) {
    throw new AdminAuthError('FORBIDDEN')
  }

  const adminUser = adminByAuthUserId

  if (!adminUser) {
    throw new AdminAuthError('FORBIDDEN')
  }

  const role = ROLE_MAP[adminUser.vloga] || 'support'

  if (jwtRole && !['admin', 'super_admin', 'support', 'finance'].includes(jwtRole)) {
    throw new AdminAuthError('FORBIDDEN')
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new AdminAuthError('FORBIDDEN')
  }

  return {
    userId: user.id,
    role,
    adminUserId: adminUser.id,
  }
}

type RouteContext = { params: Promise<unknown> }
type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse | Response>

/**
 * Wrap a route handler with admin authentication.
 * Optionally restrict to specific roles.
 *
 * export const POST = withAdminAuth(handler)
 * export const DELETE = withAdminAuth(handler, ['super_admin'])
 */
export function withAdminAuth(handler: RouteHandler, allowedRoles?: AdminRole[]): RouteHandler {
  return async (request, context) => {
    try {
      await requireAdmin(allowedRoles)
    } catch (error: any) {
      const status = error instanceof AdminAuthError && error.code === 'UNAUTHORIZED' ? 401 : 403
      const message = status === 401 ? 'Nepooblaščen dostop.' : 'Prepovedano.'
      return NextResponse.json({ error: message }, { status })
    }
    return handler(request, context)
  }
}
