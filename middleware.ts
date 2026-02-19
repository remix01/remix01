import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // First, update the session
  const response = await updateSession(request)
  
  // Protected admin routes - require authentication and ADMIN role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check if user has ADMIN role
    const userRole = user.user_metadata?.role
    if (userRole !== 'ADMIN') {
      // Not an admin → redirect to homepage
      const url = request.nextUrl.clone()
      url.pathname = '/'
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
