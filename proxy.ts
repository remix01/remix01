import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'
import { validateCsrfOrigin, isCsrfExempt, csrfForbidden } from '@/lib/csrf'
import type { User } from '@supabase/supabase-js'

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
  if (host.includes('vercel.app') && !host.includes('localhost') && !isApiRoute && !isRscRequest) {
    const url = request.nextUrl.clone()
    url.host = 'liftgo.net'
    url.protocol = 'https'
    return NextResponse.redirect(url, { status: 301 })
  }

  const retry = request.nextUrl.searchParams.get('retry')
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const isCrawler = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linkedinbot/.test(userAgent)

  if (request.method === 'GET' && isCrawler && isCategoryCityPath(pathname) && retry !== '1') {
    const retryUrl = request.nextUrl.clone()
    retryUrl.searchParams.set('retry', '1')
    retryUrl.searchParams.set('_rt', Date.now().toString())
    return NextResponse.redirect(retryUrl, { status: 302 })
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
      const response = NextResponse.redirect(new URL('/prijava', request.url))
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }

    user = authUser
  } catch (e) {
    console.error('[proxy] Auth error:', e instanceof Error ? e.message : String(e))
  }

  const path = request.nextUrl.pathname

  // ── NAROČNIK zaščita (/dashboard, /povprasevanja, ...) ──
  const narocnikPaths = [
    '/dashboard',
    '/povprasevanja',
    '/novo-povprasevanje',
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
      return NextResponse.redirect(new URL('/prijava?redirect=/partner-dashboard', request.url))
    }
    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!profile || profile.role !== 'obrtnik') {
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
  // /registracija ostane dostopna — prijavljeni z nepopolnimi profili jo potrebujejo
  if (path === '/prijava') {
    if (!user) return NextResponse.next()

    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/prijava')) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }

    // Admin ima prednost
    try {
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (adminUser) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (e) {
      console.error('[proxy] Admin check error in prijava:', e instanceof Error ? e.message : String(e))
    }

    // Obrtnik ali naročnik
    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(new URL('/partner-dashboard', request.url))
      }
    } catch (e) {
      console.error('[proxy] Profile check error in prijava:', e instanceof Error ? e.message : String(e))
    }

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
