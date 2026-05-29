import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'
import { validateCsrfOrigin, isCsrfExempt, csrfForbidden } from '@/lib/csrf'
import type { User } from '@supabase/supabase-js'

const DYNAMIC_ROUTE_EXCLUSIONS = new Set([
  'api', '_next', 'icons', 'images', 'fonts', 'admin', 'dashboard',
  'partner-dashboard', 'obrtnik', 'prijava', 'registracija',
  // Locale prefixes — handled by dedicated app/de/ and app/hr/ routes
  'de', 'hr',
])

function isCategoryCityPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length !== 2) return false
  const [category, city] = parts
  if (!category || !city) return false
  if (category.includes('.') || city.includes('.')) return false
  if (DYNAMIC_ROUTE_EXCLUSIONS.has(category)) return false
  return true
}

export async function proxy(request: NextRequest) {
  // Block common scanner/attack paths
  const blockedPaths = [
    '/wp-login.php', '/wp-admin', '/xmlrpc.php',
    '/.env', '/admin.php', '/phpmyadmin', '/wp-content', '/wp-includes',
  ]
  if (blockedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  // Force canonical domain for page traffic only.
  // Never redirect API requests because browser fetch() calls to preview domains
  // can become cross-origin and fail with "TypeError: Failed to fetch".
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/')
  // RSC navigation requests (_rsc param) are browser fetch() calls — same
  // cross-origin risk as API routes, so exempt them from the canonical redirect.
  const isRscRequest = request.nextUrl.searchParams.has('_rsc')
  if ((host === 'www.liftgo.net' || (host.includes('vercel.app') && !host.includes('localhost'))) && !isApiRoute && !isRscRequest) {
    const url = request.nextUrl.clone()
    url.host = 'liftgo.net'
    url.protocol = 'https'
    return NextResponse.redirect(url, { status: 301 })
  }


  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: User | null = null
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (
      error?.code === 'refresh_token_not_found' ||
      error?.message?.includes('Refresh Token Not Found') ||
      error?.message?.includes('Invalid Refresh Token')
    ) {
      // Don't redirect if already on an auth page — that would loop forever
      // because /prijava and /registracija are in the middleware matcher.
      const isAuthPage = pathname === '/prijava' || pathname === '/registracija'
      const response = isAuthPage
        ? NextResponse.next({ request })
        : NextResponse.redirect(new URL('/prijava', request.url))

      // Clear all supabase SSR auth cookies by name (format: sb-<ref>-auth-token[.N])
      // The legacy names sb-access-token / sb-refresh-token are NOT what @supabase/ssr sets.
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-') && name.includes('-auth-token') && !name.includes('-code-verifier')) {
          response.cookies.set(name, '', { maxAge: 0, path: '/' })
        }
      })
      return response
    }

    user = authUser
  } catch (e) {
    console.error('[proxy] Auth error:', e instanceof Error ? e.message : String(e))
  }

  const path = request.nextUrl.pathname

  // ── NAROČNIK zaščita (/dashboard, /povprasevanja, ...) ──
  // /novo-povprasevanje is intentionally excluded: the lead form must be
  // publicly accessible so visitors from SEO landing pages and /post-job/:city
  // redirects can start a request before being asked to authenticate.
  // Auth is enforced at API submission time (/api/tasks POST).
  const narocnikPaths = [
    '/dashboard',
    '/povprasevanja',
    '/profil',
    '/obvestila',
    '/ocena',
  ]
  if (narocnikPaths.some(p => path.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL(`/prijava?redirect=${path}`, request.url))
    }
    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(new URL('/partner-dashboard', request.url))
      }
    } catch (e) {
      console.error('[proxy] Naročnik profile check error:', e instanceof Error ? e.message : String(e))
    }
  }

  // ── OBRTNIK zaščita (/partner-dashboard in /obrtnik/*) ──
  if (path.startsWith('/partner-dashboard') || path.startsWith('/obrtnik')) {
    if (!user) {
      return NextResponse.redirect(new URL(`/prijava?redirect=${encodeURIComponent(path)}`, request.url))
    }
    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role === 'obrtnik') {
        // role is correctly set — allow through
      } else if (!profile?.role) {
        // Legacy session: role not set. Check obrtnik_profiles as fallback.
        // (The auth callback will backfill the role on the user's next full login.)
        const { data: obrtnikRow } = await supabaseAdmin
          .from('obrtnik_profiles').select('id').eq('id', user.id).maybeSingle()
        if (!obrtnikRow) {
          return NextResponse.redirect(new URL('/prijava?error=not_obrtnik', request.url))
        }
        // Valid obrtnik_profiles row — allow through
      } else {
        // Explicit non-obrtnik role (e.g. 'narocnik') — block
        return NextResponse.redirect(new URL('/prijava?error=not_obrtnik', request.url))
      }
    } catch (e) {
      console.error('[proxy] Obrtnik profile check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(new URL('/prijava?error=auth_failed', request.url))
    }
  }

  // ── ADMIN zaščita ───────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/prijava', request.url)
      loginUrl.searchParams.set('redirectTo', path)
      return NextResponse.redirect(loginUrl)
    }
    try {
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('id, vloga, aktiven')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!adminUser || !adminUser.aktiven) {
        const loginUrl = new URL('/prijava', request.url)
        loginUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(loginUrl)
      }

      return supabaseResponse
    } catch (e) {
      console.error('[proxy] Admin check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Preusmeritev prijavljenih od /prijava ──────────────────
  if (path === '/prijava') {
    if (!user) return NextResponse.next()

    // If there's an error param (e.g., no-profile from dashboard), allow through
    // to avoid a redirect loop: /prijava?error=... → /dashboard → /prijava?error=...
    if (request.nextUrl.searchParams.get('error')) return NextResponse.next()

    const redirectTo =
      request.nextUrl.searchParams.get('redirectTo') ||
      request.nextUrl.searchParams.get('redirect')

    let destination = '/dashboard'
    let isAdmin = false
    let isObrtnik = false

    // Admin ima prednost; use service role and aktiven=true so admin RLS cannot
    // cause /admin ↔ /prijava redirect loops.
    try {
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('aktiven', true)
        .maybeSingle()
      if (adminUser) {
        isAdmin = true
        destination = '/admin'
      }
    } catch (e) {
      console.error('[proxy] Admin check error in prijava:', e instanceof Error ? e.message : String(e))
    }

    // Obrtnik ali naročnik. Skip if already resolved as admin.
    if (!isAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (profile?.role === 'obrtnik') {
          isObrtnik = true
          destination = '/partner-dashboard'
        } else if (!profile?.role) {
          // Legacy: null role — preverimo obrtnik_profiles kot fallback
          const { data: obrtnikRow } = await supabaseAdmin
            .from('obrtnik_profiles').select('id').eq('id', user.id).maybeSingle()
          if (obrtnikRow) {
            isObrtnik = true
            destination = '/partner-dashboard'
          }
        }
      } catch (e) {
        console.error('[proxy] Profile check error in prijava:', e instanceof Error ? e.message : String(e))
      }
    }

    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.startsWith('/prijava')) {
      const adminOnlyPath = redirectTo === '/admin' || redirectTo.startsWith('/admin/')
      const obrtnikOnlyPath = redirectTo === '/partner-dashboard' || redirectTo.startsWith('/partner-dashboard/')

      if (
        (isAdmin && adminOnlyPath) ||
        (isObrtnik && obrtnikOnlyPath) ||
        (!isAdmin && !isObrtnik && !adminOnlyPath && !obrtnikOnlyPath)
      ) {
        destination = redirectTo
      }
    }

    return NextResponse.redirect(new URL(destination, request.url))
  }

  // ── Preusmeritev prijavljenih od /registracija ──────────────────────────
  // Prijavljeni uporabniki z obstoječim profilom ne smejo biti prisiljeni v
  // novo registracijo. Preusmerimo jih na njihov portal.
  // Prijavljeni brez profila ali brez vloge so še vedno dobrodošli (onboarding).
  if (path === '/registracija') {
    if (!user) return supabaseResponse

    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()

      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(new URL('/partner-dashboard', request.url))
      }
      if (profile?.role) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // role is null / no profile → allow onboarding
    } catch (e) {
      console.error('[proxy] Registracija profile check error:', e instanceof Error ? e.message : String(e))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/:category((?!api|_next|icons|images|fonts|admin|dashboard|partner-dashboard|obrtnik|prijava|registracija)[^/]+)/:city',
    '/dashboard',
    '/dashboard/:path*',
    '/povprasevanja/:path*',
    '/novo-povprasevanje/:path*',
    '/profil/:path*',
    '/obvestila/:path*',
    '/ocena/:path*',
    '/partner-dashboard',
    '/partner-dashboard/:path*',
    '/obrtnik/:path*',
    '/admin/:path*',
    '/prijava',
    '/registracija',
  ],
}
