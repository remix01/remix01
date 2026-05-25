import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureOAuthProfile } from '@/app/(auth)/actions'
import { getSafeNextPath } from '@/lib/auth/oauth'

const DEFAULT_REDIRECT = '/dashboard'

function logAuth(stage: string, details: Record<string, string | null | undefined> = {}) {
  console.info('[auth.callback]', { stage, ...details })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const intendedRole = url.searchParams.get('role') === 'obrtnik' ? 'obrtnik' : 'narocnik'
  const safeNext = getSafeNextPath(url.searchParams.get('next'))

  if (error) {
    logAuth('provider_error', { error })
    return NextResponse.redirect(new URL('/prijava?error=oauth_failed', request.url))
  }

  if (!code) {
    logAuth('missing_code')
    return NextResponse.redirect(new URL('/prijava?error=oauth_missing_code', request.url))
  }

  try {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logAuth('exchange_failed', { error: exchangeError.message })
      return NextResponse.redirect(new URL('/prijava?error=oauth_exchange_failed', request.url))
    }

    await ensureOAuthProfile(intendedRole)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      logAuth('missing_session_after_exchange')
      return NextResponse.redirect(new URL('/prijava?error=oauth_session_missing', request.url))
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    let destination = safeNext ?? DEFAULT_REDIRECT

    if (adminUser) {
      destination = '/admin'
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'obrtnik') destination = '/partner-dashboard'
      else if (profile?.role === 'narocnik') destination = safeNext ?? '/dashboard'
      else logAuth('role_mismatch', { userId: user.id })
    }

    logAuth('success', { destination })
    return NextResponse.redirect(new URL(destination, request.url))
  } catch (e) {
    logAuth('unexpected_error', { error: e instanceof Error ? e.message : String(e), hint: errorDescription })
    return NextResponse.redirect(new URL('/prijava?error=oauth_unexpected', request.url))
  }
}
