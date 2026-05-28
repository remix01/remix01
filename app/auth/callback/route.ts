import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'
import { resolveAuthState } from '@/lib/auth/role-resolver'
import { getSafeNextPath } from '@/lib/auth/oauth'
import type { Database } from '@/types/supabase'

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

  logAuth('code_present', { intendedRole, safeNext })

  // Collect cookies so they can be placed directly on the final redirect response.
  // This avoids relying on next/headers mutations propagating to NextResponse.redirect(),
  // which is unreliable in Next.js 16 / Turbopack-first builds.
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options: options ?? {} })
            })
          },
        },
      },
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logAuth('exchange_failed', { error: exchangeError.message })
      return NextResponse.redirect(new URL('/prijava?error=oauth_exchange_failed', request.url))
    }

    logAuth('exchange_ok', { cookieCount: String(pendingCookies.length) })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) {
      logAuth('missing_session_after_exchange')
      return NextResponse.redirect(new URL('/prijava?error=oauth_session_missing', request.url))
    }

    logAuth('user_resolved', { userId: user.id })

    // Use admin client for all DB lookups — avoids RLS dependency at callback time
    // and eliminates the separate-client session-visibility problem.
    const adminClient = createAdminClient()

    // Ensure profile exists; create one for first-time OAuth users
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    logAuth('profile_check', {
      userId: user.id,
      found: existingProfile ? 'yes' : 'no',
      role: existingProfile?.role ?? null,
    })

    if (!existingProfile) {
      try {
        await canonicalWriteGateway.createOrUpdateProfile(
          {
            id: user.id,
            role: intendedRole,
            email: user.email ?? null,
            full_name:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              null,
          },
          'auth.oauth.callback',
        )

        if (intendedRole === 'obrtnik') {
          await canonicalWriteGateway.createOrUpdateProviderProfile(
            {
              id: user.id,
              business_name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                user.email ??
                'Novi partner',
            },
            'auth.oauth.callback',
          )
        }

        logAuth('profile_created', { userId: user.id, role: intendedRole })
      } catch (e) {
        logAuth('profile_create_error', {
          userId: user.id,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    // Determine destination via shared resolver — priority: admin > obrtnik > narocnik > registration
    const resolved = await resolveAuthState(user)

    logAuth('role_resolver', {
      userId: user.id,
      role: resolved.role,
      hasProfile: resolved.hasProfile ? 'yes' : 'no',
      usedLegacyObrtnikUserId: resolved.usedLegacyObrtnikUserId ? 'yes' : 'no',
    })

    let destination = DEFAULT_REDIRECT

    if (!resolved.hasProfile) {
      destination = '/registracija'
    } else if (resolved.role === 'admin') {
      destination = '/admin'
    } else if (resolved.role === 'obrtnik') {
      destination = '/partner-dashboard'
      if (!resolved.profileRole) {
        await adminClient
          .from('profiles')
          .update({ role: 'obrtnik' })
          .eq('id', user.id)
      }
    } else {
      destination = '/dashboard'
    }

    // Apply safeNext override (role-aware)
    if (safeNext) {
      const isAdmin = destination === '/admin'
      const isObrtnik = destination === '/partner-dashboard'
      const adminOnlyPath = safeNext === '/admin' || safeNext.startsWith('/admin/')
      const obrtnikOnlyPath =
        safeNext === '/partner-dashboard' || safeNext.startsWith('/partner-dashboard/')

      if (
        (isAdmin && adminOnlyPath) ||
        (isObrtnik && obrtnikOnlyPath) ||
        (!isAdmin && !isObrtnik && !adminOnlyPath && !obrtnikOnlyPath)
      ) {
        destination = safeNext
      } else {
        logAuth('ignored_unsafe_next_for_role', { destination, safeNext })
      }
    }

    logAuth('redirect', { destination })

    // Build final redirect and explicitly attach session cookies
    const response = NextResponse.redirect(new URL(destination, request.url))
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    })
    return response
  } catch (e) {
    logAuth('unexpected_error', {
      error: e instanceof Error ? e.message : String(e),
      hint: errorDescription,
    })
    return NextResponse.redirect(new URL('/prijava?error=oauth_unexpected', request.url))
  }
}
