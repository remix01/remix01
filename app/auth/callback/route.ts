import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/prijava?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/prijava?error=auth_failed`)
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile) {
    // New Google user — create narocnik profile
    const fullName =
      data.user.user_metadata?.full_name ??
      data.user.user_metadata?.name ??
      data.user.email?.split('@')[0] ??
      ''

    await supabase.from('profiles').insert({
      id: data.user.id,
      role: 'narocnik',
      full_name: fullName,
      email: data.user.email ?? '',
    })

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Existing user — respect custom next param or redirect by role
  if (next?.startsWith('/')) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}${profile.role === 'obrtnik' ? '/partner-dashboard' : '/dashboard'}`
  )
}
