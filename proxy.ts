import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'
import { validateCsrfOrigin, isCsrfExempt, csrfForbidden } from '@/lib/csrf'
import type { User } from '@supabase/supabase-js'
import { resolveAuthState } from '@/lib/auth/role-resolver'

const DYNAMIC_ROUTE_EXCLUSIONS = new Set([
  'api', '_next', 'icons', 'images', 'fonts', 'admin', 'dashboard',
  'partner-dashboard', 'obrtnik', 'prijava', 'registracija',
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


  let resolved: Awaited<ReturnType<typeof resolveAuthState>> | null = null
  if (user) {
    try {
      resolved = await resolveAuthState(user)
      if (resolved.role === 'obrtnik' && !resolved.profileRole) {
        await supabaseAdmin.from('profiles').update({ role: 'obrtnik' }).eq('id', user.id)
      }
    } catch (e) {
      console.error('[proxy] Role resolver error:', e instanceof Error ? e.message : String(e))
    }
  }

  // ── NAROČNIK zaščita (/dashboard, /povprasevanja, ...) ──
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
    if (!resolved?.hasProfile) {
      return NextResponse.redirect(new URL('/registracija', request.url))
    }
    if (resolved.role === 'obrtnik') {
      return NextResponse.redirect(new URL('/partner-dashboard', request.url))
    }
    if (resolved.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  if (path.startsWith('/partner-dashboard') || path.startsWith('/obrtnik')) {
    if (!user) {
      return NextResponse.redirect(new URL('/prijava?redirect=/partner-dashboard', request.url))
    }
    if (!resolved?.hasProfile) {
      return NextResponse.redirect(new URL('/registracija', request.url))
    }
    if (resolved.role !== 'obrtnik' && resolved.role !== 'admin') {
      return NextResponse.redirect(new URL('/prijava?error=not_obrtnik', request.url))
    }
  }

  if (path.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/prijava', request.url)
      loginUrl.searchParams.set('redirectTo', path)
      return NextResponse.redirect(loginUrl)
    }
    if (resolved?.role !== 'admin') {
      const loginUrl = new URL('/prijava', request.url)
      loginUrl.searchParams.set('redirectTo', path)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  if (path === '/prijava') {
    if (!user) return NextResponse.next()

    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/prijava')) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }

    if (!resolved?.hasProfile) return NextResponse.redirect(new URL('/registracija', request.url))
    if (resolved.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    if (resolved.role === 'obrtnik') return NextResponse.redirect(new URL('/partner-dashboard', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
