import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Supabase Auth callback handler.
 * Handles:
 *  - Email confirmation links
 *  - OAuth provider redirects (Google, GitHub, …)
 *  - Magic link sign-ins
 *
 * Supabase redirects here with ?code=… after the OAuth flow.
 * We exchange the code for a session and redirect the user
 * to their role-appropriate dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Determine role-based redirect
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role === 'obrtnik') {
          return NextResponse.redirect(new URL('/obrtnik/dashboard', origin))
        }
        if (profile?.role === 'narocnik') {
          return NextResponse.redirect(new URL('/dashboard', origin))
        }
      }

      // Fallback: honour the `next` param or go home
      const redirectTo = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(new URL(redirectTo, origin))
    }
  }

  // Auth failed — send to error page
  return NextResponse.redirect(new URL('/auth/error', origin))
}
