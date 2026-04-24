import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/me] Error:', new Error('Missing SUPABASE_SERVICE_ROLE_KEY'))
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('[admin/me] Error:', userError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // No auth user - return 401 (not authenticated)
    if (!user?.id) {
      console.log('[v0] Admin check: No authenticated user')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[v0] Admin check: Checking user', user.id)

    // Fetch admin from admin_users table by auth_user_id
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError) {
      console.error('[admin/me] Error:', adminError)
      return NextResponse.json(
        { error: 'Internal server error', details: adminError.message },
        { status: 500 }
      )
    }

    // User exists but is not an active admin - return 403 (forbidden)
    if (!admin) {
      console.log('[v0] Admin check: User is not an active admin')
      return NextResponse.json(
        { error: 'Not an active admin' },
        { status: 403 }
      )
    }

    // User is an active admin - return 200 (success)
    console.log('[v0] Admin check: User is admin', admin.id)
    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        vloga: admin.vloga,
        aktiven: admin.aktiven,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('[admin/me] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
