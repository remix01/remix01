import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // Block common WordPress/scanner attack paths
  const blockedPaths = [
    '/wp-login.php', '/wp-admin', '/xmlrpc.php', 
    '/.env', '/admin.php', '/phpmyadmin', '/wp-content', '/wp-includes'
  ]
  if (blockedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  // Force canonical domain
  const host = request.headers.get('host') || ''
  if (host.includes('vercel.app') && !host.includes('localhost')) {
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
        .single()

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
        .single()

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
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!adminUser) {
        const loginUrl = new URL('/prijava', request.url)
        loginUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(loginUrl)
      }
      
      // ✅ Admin is verified — skip all other checks and allow request
      return NextResponse.next()
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
    
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

  // ── Preusmeritev prijavljenih stran od /registracija ─────────
  if (path === '/registracija') {
    if (!user) return NextResponse.next()

    try {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo')
      
      // If redirectTo is /admin/* — check admin status before redirecting
      if (redirectTo?.startsWith('/admin')) {
        try {
          const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
          
          if (adminUser) {
            return NextResponse.redirect(new URL(redirectTo, request.url))
          }
        } catch (e) {
          // Admin check failed
        }
        return NextResponse.redirect(new URL('/', request.url))
      }
      
      // For other redirectTo paths — redirect directly if valid
      if (redirectTo?.startsWith('/')) {
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
      
      // Default — check role and redirect to appropriate dashboard
      // First check if partner (old system)
      try {
        const { data: partner } = await supabaseAdmin
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (partner) {
          return NextResponse.redirect(
            new URL('/partner-dashboard', request.url)
          )
        }
      } catch (e) {
        // Partner check failed or no partner
      }

      // Check if obrtnik (new system)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(
          new URL('/obrtnik/dashboard', request.url)
        )
      }

      // Check if admin
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (adminUser) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // Default to naročnik dashboard
      const redirect = request.nextUrl.searchParams.get('redirect')
      return NextResponse.redirect(
        new URL(redirect || '/dashboard', request.url)
      )
    } catch (e) {
      console.error('[v0] Redirect check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
    
    return NextResponse.redirect(new URL('/', request.url))
  }

    try {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo')
      
      // If redirectTo is /admin/* — check admin status before redirecting
      if (redirectTo?.startsWith('/admin')) {
        try {
          const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
          
          if (adminUser) {
            return NextResponse.redirect(new URL(redirectTo, request.url))
          }
        } catch (e) {
          // Admin check failed
        }
        return NextResponse.redirect(new URL('/', request.url))
      }
      
      // For other redirectTo paths — redirect directly if valid
      if (redirectTo?.startsWith('/')) {
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
      
      // Default — check role and redirect to appropriate dashboard
      // First check if partner (old system)
      try {
        const { data: partner } = await supabaseAdmin
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (partner) {
          return NextResponse.redirect(
            new URL('/partner-dashboard', request.url)
          )
        }
      } catch (e) {
        // Partner check failed or no partner
      }

      // Check if obrtnik (new system)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'obrtnik') {
        return NextResponse.redirect(
          new URL('/obrtnik/dashboard', request.url)
        )
      }

      // Check if admin
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (adminUser) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // Default to naro��nik dashboard
      const redirect = request.nextUrl.searchParams.get('redirect')
      return NextResponse.redirect(
        new URL(redirect || '/dashboard', request.url)
      )
    } catch (e) {
      console.error('[v0] Redirect check error:', e instanceof Error ? e.message : String(e))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
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
