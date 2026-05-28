import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/partner/me
 *
 * Returns the full obrtnik_profiles row for the authenticated user.
 * Uses the admin client to bypass RLS (SELECT policy is is_verified=true,
 * so unverified obrtniks cannot read their own row via session client).
 * Auth is still validated via the session client before the admin read.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[api/partner/me] DB error:', error.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
