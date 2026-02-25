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

  // ── /admin zaščita ─────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') return supabaseResponse

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
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

  // ── /partner-dashboard zaščita ─────────────────────────────────
  if (path.startsWith('/partner-dashboard')) {
    if (!user) {
      return NextResponse.redirect(
        new URL('/partner-auth/sign-in', request.url)
      )
    }

    const { data: obrtnik } = await supabase
      .from('obrtniki')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (!obrtnik) {
      return NextResponse.redirect(
        new URL('/partner-auth/sign-up', request.url)
      )
    }
  }

  // ── /partner-auth preusmeritev (že prijavljen) ──────────────────
  if (
    path.startsWith('/partner-auth') &&
    path !== '/partner-auth/verify-email' &&
    path !== '/partner-auth/reset-password'
  ) {
    if (user) {
      const { data: obrtnik } = await supabase
        .from('obrtniki')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (obrtnik) {
        return NextResponse.redirect(
          new URL('/partner-dashboard', request.url)
        )
      }
    }
  }

  // ── /povprasevanje — obvezna registracija stranke ───────────────
  if (path.startsWith('/povprasevanje')) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/prijava?redirect=/povprasevanje`, request.url)
      )
    }

    // Preveri da prijavljen user NI obrtnik ali admin
    const { data: obrtnik } = await supabase
      .from('obrtniki')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (obrtnik) {
      // Obrtnik ne more oddati povpraševanja — preusmeri na dashboard
      return NextResponse.redirect(
        new URL('/partner-dashboard', request.url)
      )
    }
  }

  // ── /moje-povprasevanje — stranka dashboard ─────────────────────
  if (path.startsWith('/moje-povprasevanje')) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/prijava?redirect=${path}`, request.url)
      )
    }
  }

  // ── /prijava in /registracija — preusmeritev če že prijavljen ───
  if (path === '/prijava' || path === '/registracija') {
    if (user) {
      // Preveri tip userja in preusmeri na pravi dashboard
      const { data: obrtnik } = await supabase
        .from('obrtniki')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (obrtnik) {
        return NextResponse.redirect(
          new URL('/partner-dashboard', request.url)
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

      // Navadna stranka
      return NextResponse.redirect(
        new URL('/moje-povprasevanje', request.url)
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/partner-dashboard/:path*',
    '/partner-auth/:path*',
    '/povprasevanje/:path*',
    '/moje-povprasevanje/:path*',
    '/prijava',
    '/registracija',
  ],
}