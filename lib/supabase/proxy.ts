import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '../env'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (request.nextUrl.pathname.startsWith('/partner-dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/partner-auth/login'
      return NextResponse.redirect(url)
    }
  }

  // Verify partner access for /partner-dashboard
  if (user && request.nextUrl.pathname.startsWith('/partner-dashboard')) {
    // Check for partner record in old system
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('id', user.id)
      .single()

    // If no old system partner, check new system profiles/obrtnik table
    if (!partner) {
      const { data: obrtnikProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      // If neither partner nor obrtnik profile exists, redirect to signup
      if (!obrtnikProfile) {
        const url = request.nextUrl.clone()
        url.pathname = '/partner-auth/sign-up'
        return NextResponse.redirect(url)
      }
      // Has obrtnik profile in new system - allow access
    }
    // Has partner record in old system - allow access
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
