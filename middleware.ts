import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // First, update the session
  const response = await updateSession(request)
  
  // Protected admin routes - require authentication and admin_users record
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Allow access to setup page without authentication
    if (request.nextUrl.pathname === '/admin/setup') {
      return response
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check if user is in admin_users table and is active
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, aktiven')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!adminUser || !adminUser.aktiven) {
      // Not an admin or inactive → redirect to homepage
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Protected naročnik routes - require authentication and naročnik role
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/novo-povprasevanje') ||
      request.nextUrl.pathname.startsWith('/povprasevanja') ||
      request.nextUrl.pathname.startsWith('/profil')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/prijava'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check if user has naročnik role
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    
    if (profile?.user_type !== 'narocnik') {
      // Not a naročnik → redirect to homepage or obrtnik dashboard
      const url = request.nextUrl.clone()
      url.pathname = profile?.user_type === 'obrtnik' ? '/obrtnik/dashboard' : '/'
      return NextResponse.redirect(url)
    }
  }

  // Protected obrtnik routes - require authentication and obrtnik role
  if (request.nextUrl.pathname.startsWith('/obrtnik')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/prijava'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check if user has obrtnik role
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    
    if (profile?.user_type !== 'obrtnik') {
      // Not an obrtnik → redirect to homepage or naročnik dashboard
      const url = request.nextUrl.clone()
      url.pathname = profile?.user_type === 'narocnik' ? '/dashboard' : '/'
      return NextResponse.redirect(url)
    }
  }

  // Protected partner routes - require authentication
  if (request.nextUrl.pathname.startsWith('/partner-dashboard')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/partner-auth/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check if user has partner/craftworker role
    const userRole = user.user_metadata?.user_type
    if (userRole !== 'partner' && userRole !== 'craftworker') {
      // Not a partner → redirect to homepage
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }
  
  // Skip ToS check for public routes
  const publicRoutes = ['/terms', '/api', '/_next', '/auth', '/partner-auth']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  if (isPublicRoute) {
    return response
  }

  // Check if user is authenticated and is a craftworker
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return response
  }

  // For craftworker-specific routes, check ToS acceptance
  const craftworkerRoutes = ['/partner-dashboard', '/registracija-mojster']
  const isCraftworkerRoute = craftworkerRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  if (isCraftworkerRoute) {
    try {
      // Check if user has accepted terms (would need database lookup)
      // For now, we'll redirect if the query param isn't set
      const hasAcceptedTerms = request.cookies.get('tos_accepted')
      
      if (!hasAcceptedTerms && !request.nextUrl.pathname.includes('/terms/craftworker')) {
        const url = request.nextUrl.clone()
        url.pathname = '/terms/craftworker'
        url.searchParams.set('required', 'true')
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('[middleware] Error checking ToS:', error)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
