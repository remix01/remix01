import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureOAuthProfile } from '@/app/(auth)/actions'
import { getCanonicalAppOrigin, getSafeInternalRedirect } from '@/lib/auth/oauth'

type Role = 'narocnik' | 'obrtnik'

function sanitizeRole(role: string | null): Role {
  return role === 'obrtnik' ? 'obrtnik' : 'narocnik'
}

function safeCallbackRedirect(next: string | null): string {
  const safe = getSafeInternalRedirect(next, '/dashboard')
  if (safe.startsWith('/auth/callback')) return '/dashboard'
  return safe
}

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, `${getCanonicalAppOrigin()}/`))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const provider = searchParams.get('provider') ?? 'google'
  const role = sanitizeRole(searchParams.get('role'))
  const next = safeCallbackRedirect(searchParams.get('next'))

  if (!code) {
    console.warn('[oauth.callback] missing code', { provider, hasCode: false, next })
    return redirectTo('/prijava?error=oauth_missing_code')
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.warn('[oauth.callback] exchange failed', {
      provider,
      hasCode: true,
      error: exchangeError.message,
      next,
    })
    return redirectTo('/prijava?error=oauth_exchange_failed')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[oauth.callback] user missing after exchange', { provider, hasCode: true, next })
    return redirectTo('/prijava?error=oauth_user_missing')
  }

  try {
    await ensureOAuthProfile(role)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.warn('[oauth.callback] profile bootstrap failed', { provider, hasCode: true, error: message, next })
    return redirectTo('/prijava?error=oauth_profile_failed')
  }

  return redirectTo(next)
}
