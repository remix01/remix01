import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/narocnik',
  '/obrtnik',
  '/dashboard',
  '/partner-dashboard',
]

// Routes only accessible to unauthenticated users
const AUTH_ONLY_ROUTES = ['/prijava', '/registracija']

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

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err: any) {
    // refresh_token_not_found — stale cookie; clear session and redirect to login
    if (err?.code === 'refresh_token_not_found' || err?.message?.includes('Refresh Token Not Found')) {
      const response = NextResponse.redirect(new URL('/prijava', request.url))
      // Clear all Supabase auth cookies
      request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => response.cookies.delete(c.name))
      return response
    }
    // For other auth errors, continue without user
  }

  const { pathname } = request.nextUrl

  // Redirect authenticated users away from login/register pages
  if (user && AUTH_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_ROUTES.some(r => pathname.startsWith(r))) {
    const redirectUrl = new URL('/prijava', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - api/cron (cron jobs — no session needed)
     * - api/webhooks (webhooks — signed, not session-based)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/cron|api/webhooks).*)',
  ],
}
