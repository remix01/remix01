import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'
import { validateCsrfOrigin, isCsrfExempt, csrfForbidden } from '@/lib/csrf'

const DYNAMIC_ROUTE_EXCLUSIONS = new Set([
  'api', '_next', 'icons', 'images', 'fonts', 'admin', 'dashboard', 'obrtnik', 'prijava', 'registracija',
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
  // Block common WordPress/scanner attack paths
  const blockedPaths = [
    '/wp-login.php', '/wp-admin', '/xmlrpc.php', 
    '/.env', '/admin.php', '/phpmyadmin', '/wp-content', '/wp-includes'
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
  if (host.includes('vercel.app') && !host.includes('localhost') && !isApiRoute) {
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

  let user = null
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    
    // Handle expired/invalid refresh token
    if (error?.code === 'refresh_token_not_found' ||
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('Invalid Refresh Token')) {
      // Clear invalid session and redirect to login
      const response = NextResponse.redirect(
        new URL('/prijava', request.url)
      )
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }
    
    user = authUser
  } catch (e) {
    // Silent fail — don't crash middleware
    console.error('[v0] Proxy middleware error:', e instanceof Error ? e.message : String(e))
  }

  const path = request.nextUrl.pathname

  // ── CSRF ZAŠČITA ────────────────────────────────────────
  // Preveri Origin header za vse mutacijske API klice
  const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
  if (
    path.startsWith('/api/') &&
    MUTATION_METHODS.has(request.method) &&
    !isCsrfExempt(path)
  ) {
    if (!validateCsrfOrigin(request)) {
      return csrfForbidden()
    }
  }

  // ── ADMIN API ZAŠČITA ───────────────────────────────────
  // Defense-in-depth: preveri admin_users za vse /api/admin/* klice.
  // Posamezni route-i z withAdminAuth/requireAdmin še vedno naredijo
  // lastno preverjanje (role-based), to je samo varnostna mreža.
  if (path.startsWith('/api/admin/')) {
    if (!user) {
      return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })
    }
    try {
      const { data: adminByAuthUserId, error: authUserLookupError } = await supabaseAdmin
        .from('admin_users')
        .select('id, aktiven')
        .eq('auth_user_id', user.id)
        .eq('aktiven', true)
        .maybeSingle()

      // PGRST204 = column not in schema cache; fall through to legacy user_id check
      if (authUserLookupError && authUserLookupError.code !== 'PGRST204') {
        console.error('[v0] Admin lookup error:', authUserLookupError.message)
        throw authUserLookupError
      }

      let hasAdminAccess = Boolean(adminByAuthUserId)

      if (!hasAdminAccess) {
        // Legacy fallback for schemas where admin_users references user_id.
        const { data: adminByUserId, error: userIdLookupError } = await supabaseAdmin
          .from('admin_users')
          .select('id, aktiven')
          .eq('user_id', user.id)
          .eq('aktiven', true)
          .maybeSingle()

        // If user_id doesn't exist in this schema, treat as "not found" fallback.
        if (userIdLookupError && userIdLookupError.code !== 'PGRST204') {
          throw userIdLookupError
        }

        hasAdminAccess = Boolean(adminByUserId)
      }

      if (!hasAdminAccess) {
        return NextResponse.json({ error: 'Prepovedano.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Napaka pri preverjanju dostopa.' }, { status: 500 })
    }
  }

  // ── NAROČNIK dashboard zaščita ──────────────────────────
  // Vse pod /dashboard, /povprasevanja, /profil, /obvestila, /ocena
  // ki niso pod /admin ali /obrtnik
  const narocnikPaths = [
    '/dashboard',
    '/povprasevanja',
    '/novo-povprasevanje',
    '/profil',
    '/obvestila',
    '/ocena',
  ]

  const isNarocnikPath = narocnikPaths.some(p => path.startsWith(p))

  if (isNarocnikPath) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/prijava?redirect=${path}`, request.url)
      )
    }

    // Preveri da je res naročnik (ne obrtnik, ne admin)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(
          new URL('/obrtnik/dashboard', request.url)
        )
      }
    } catch (e) {
      console.error('[v0] Profile check error:', e instanceof Error ? e.message : String(e))
    }
  }

  // ── OBRTNIK dashboard zaščita ───────────────────────────
  if (path.startsWith('/obrtnik')) {
    if (!user) {
      return NextResponse.redirect(
        new URL('/prijava?redirect=/obrtnik/dashboard', request.url)
      )
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'obrtnik') {
        return NextResponse.redirect(
          new URL('/prijava?error=not_obrtnik', request.url)
        )
      }
    } catch (e) {
      console.error('[v0] Obrtnik check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(
        new URL('/prijava?error=auth_failed', request.url)
      )
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
      
      // ✅ Admin is verified — keep supabaseResponse so auth cookies stay in sync
      return supabaseResponse
    } catch (e) {
      console.error('[v0] Admin check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(
        new URL('/', request.url)
      )
    }
  }

  // ── Preusmeritev prijavljenih stran od /prijava ─────────
  if (path === '/prijava') {
    if (!user) return NextResponse.next()
    
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('/prijava')) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    
    // Check for admin first
    try {
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (adminUser) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (e) {
      console.error('[v0] Admin check error in prijava redirect:', e instanceof Error ? e.message : String(e))
    }

    // Check for partner (legacy table)
    try {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (partner) {
        return NextResponse.redirect(new URL('/partner-dashboard', request.url))
      }
    } catch (e) {
      console.error('[v0] Partner check error in prijava redirect:', e instanceof Error ? e.message : String(e))
    }

    // Check role in profiles (current auth flow)
    try {
      const { data: profileById } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const { data: profileByAuthUserId } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      const profile = (profileById ?? profileByAuthUserId) as { role: string | null } | null

      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(new URL('/partner-dashboard', request.url))
      }

      if (profile?.role) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (e) {
      console.error('[v0] Profile check error in prijava redirect:', e instanceof Error ? e.message : String(e))
    }

    // If authenticated but profile is missing, continue to login page
    // so users can choose next step (instead of being forced to home).
    return NextResponse.next()
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/api/:path*',
    '/:category((?!api|_next|icons|images|fonts|admin|dashboard|obrtnik|prijava|registracija)[^/]+)/:city',
    '/dashboard/:path*',
    '/povprasevanja/:path*',
    '/novo-povprasevanje/:path*',
    '/profil/:path*',
    '/obvestila/:path*',
    '/ocena/:path*',
    '/obrtnik/:path*',
    '/admin/:path*',
    '/prijava',
    '/registracija',
  ],
}
