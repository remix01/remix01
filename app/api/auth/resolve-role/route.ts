import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthState } from '@/lib/auth/role-resolver'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })

  const resolved = await resolveAuthState(user)
  return NextResponse.json({ authenticated: true, role: resolved.role, hasProfile: resolved.hasProfile })
}
