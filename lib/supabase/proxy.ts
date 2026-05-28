import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { env } from '../env'
import { resolveAuthState } from '@/lib/auth/role-resolver'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  
  let user: User | null = null
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    
    // Handle expired/invalid refresh token
    if (error?.code === 'refresh_token_not_found' ||
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('Invalid Refresh Token')) {
      // Clear invalid session and redirect to the correct login screen
      const isPartnerArea =
        request.nextUrl.pathname.startsWith('/partner-dashboard') ||
        request.nextUrl.pathname.startsWith('/obrtnik')
      const response = NextResponse.redirect(new URL('/prijava', request.url))
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }
    
    user = authUser
  } catch (e) {
    // Silent fail — don't crash middleware
    console.error('[v0] UpdateSession error:', e instanceof Error ? e.message : String(e))
  }

  if (!user) {
    if (request.nextUrl.pathname.startsWith('/partner-dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/prijava'
      return NextResponse.redirect(url)
    }
  }

  // Verify partner access for /partner-dashboard using shared resolver
  if (user && request.nextUrl.pathname.startsWith('/partner-dashboard')) {
    try {
      const resolved = await resolveAuthState(user)
      if (!resolved.hasProfile) {
        const url = request.nextUrl.clone()
        url.pathname = '/registracija'
        return NextResponse.redirect(url)
      }
      if (resolved.role !== 'obrtnik' && resolved.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/prijava'
        url.searchParams.set('error', 'not_obrtnik')
        return NextResponse.redirect(url)
      }
    } catch (e) {
      console.error('[v0] Partner check error:', e instanceof Error ? e.message : String(e))
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
