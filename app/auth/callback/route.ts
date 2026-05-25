import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureOAuthProfile } from '@/app/(auth)/actions'
import { getSafeInternalRedirect } from '@/lib/auth/oauth'

type Role = 'narocnik' | 'obrtnik'

function sanitizeRole(role: string | null): Role {
  return role === 'obrtnik' ? 'obrtnik' : 'narocnik'
}

function safeCallbackRedirect(next: string | null): string | null {
  if (!next) return null
  const safe = getSafeInternalRedirect(next, '/dashboard')
  if (safe.startsWith('/auth/callback')) return '/dashboard'
  return safe
}

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.url))
}

async function resolvePostOAuthRoute(userId: string) {
  const supabase = await createClient()

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('aktiven', true)
    .maybeSingle()

  if (adminUser) return '/admin'

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'obrtnik') return '/partner-dashboard'
  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const provider = searchParams.get('provider') ?? 'google'
  const role = sanitizeRole(searchParams.get('role'))
  const requestedNext = safeCallbackRedirect(searchParams.get('next'))

  if (!code) {
    console.warn('[oauth.callback] missing code', { provider, hasCode: false, next: requestedNext ?? null })
    return redirectTo('/prijava?error=oauth_missing_code', request)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.warn('[oauth.callback] exchange failed', { provider, hasCode: true, error: exchangeError.message, next: requestedNext ?? null })
    return redirectTo('/prijava?error=oauth_exchange_failed', request)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[oauth.callback] user missing after exchange', { provider, hasCode: true, next: requestedNext ?? null })
    return redirectTo('/prijava?error=oauth_user_missing', request)
  }

  try {
    await ensureOAuthProfile(role)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.warn('[oauth.callback] profile bootstrap failed', { provider, hasCode: true, error: message, next: requestedNext ?? null })
    return redirectTo('/prijava?error=oauth_profile_failed', request)
  }

  const finalNext = requestedNext ?? await resolvePostOAuthRoute(user.id)
  return redirectTo(finalNext, request)
}
