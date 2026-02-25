import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
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
  }

  // ── OBRTNIK dashboard zaščita ───────────────────────────
  if (path.startsWith('/obrtnik')) {
    if (!user) {
      return NextResponse.redirect(
        new URL('/prijava?redirect=/obrtnik/dashboard', request.url)
      )
    }

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
  }

  // ── ADMIN zaščita ───────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') return supabaseResponse

    if (!user) {
      return NextResponse.redirect(
        new URL('/admin/login', request.url)
      )
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.redirect(
        new URL('/admin/login?error=unauthorized', request.url)
      )
    }
  }

  // ── Preusmeritev prijavljenih stran od /prijava ─────────
  if (path === '/prijava' || path === '/registracija') {
    if (user) {
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

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (adminUser) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // Naročnik
      const redirect = request.nextUrl.searchParams.get('redirect')
      return NextResponse.redirect(
        new URL(redirect || '/dashboard', request.url)
      )
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
