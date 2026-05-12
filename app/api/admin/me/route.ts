import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/me] Error:', new Error('Missing SUPABASE_SERVICE_ROLE_KEY'))
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const adminCtx = await requireAdmin()

    // Fetch admin from admin_users table by admin id
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', adminCtx.adminUserId)
      .maybeSingle()

    if (adminError) {
      console.error('[admin/me] Error:', adminError)
      return NextResponse.json(
        {
          ok: false,
          error: 'Internal server error',
          canonical_error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: adminError.message,
          },
          details: adminError.message,
        },
        { status: 500 }
      )
    }

    // User exists but is not an active admin - return 403 (forbidden)
    if (!admin) {
      console.log('[v0] Admin check: User is not an active admin')
      return NextResponse.json(
        {
          ok: false,
          error: 'Not an active admin',
          canonical_error: {
            code: 'FORBIDDEN',
            message: 'Not an active admin',
          },
        },
        { status: 403 }
      )
    }

    // User is an active admin - return 200 (success)
    console.log('[v0] Admin check: User is admin', admin.id)
    return NextResponse.json({
      ok: true,
      admin: {
        id: admin.id,
        email: admin.email,
        vloga: admin.vloga,
        aktiven: admin.aktiven,
      },
    }, { status: 200 })
  } catch (error) {
    const authFailure = toAdminAuthFailure(error)
    if (authFailure.code === 'UNAUTHORIZED' || authFailure.code === 'FORBIDDEN') {
      console.warn('[admin/me] Auth rejected:', authFailure.code)
      return NextResponse.json(
        {
          ok: false,
          error: authFailure.status === 401 ? 'Not authenticated' : 'Not an active admin',
          canonical_error: {
            code: authFailure.code,
            message: authFailure.status === 401 ? 'Not authenticated' : 'Not an active admin',
          },
        },
        { status: authFailure.status }
      )
    }

    console.error('[admin/me] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        canonical_error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    )
  }
}
