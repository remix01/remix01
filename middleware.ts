import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req })

  try {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value)
            })
            supabaseResponse = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const pathname = req.nextUrl.pathname

    // Public routes — never redirect
    const publicPaths = [
      '/',
      '/kako-deluje',
      '/blog',
      '/orodja',
      '/e-kljuc',
      '/za-obrtnike',
      '/cenik',
      '/prijava',
      '/registracija',
      '/about',
      '/contact',
      '/faq',
      '/terms',
      '/privacy',
      '/search',
    ]

    const isPublic = publicPaths.some(p =>
      pathname === p || pathname.startsWith(p + '/')
    )

    if (isPublic) return supabaseResponse

    // Protected routes
    const isProtected = ['/dashboard', '/partner-dashboard', '/admin'].some(p =>
      pathname.startsWith(p)
    )

    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/prijava', req.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error('[v0] Middleware error:', error)
    return supabaseResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)).*)' ],
}
