import { NextResponse } from 'next/server'
import type { AuthError } from '@supabase/supabase-js'

/**
 * Handle authentication errors consistently across all API routes.
 * Detects refresh token failures and returns proper 401 responses.
 */
export function handleAuthError(error: unknown): NextResponse {
  const authError = error as AuthError

  // Check for refresh token errors
  const isRefreshTokenError =
    authError?.code === 'refresh_token_not_found' ||
    authError?.message?.includes('Refresh Token Not Found') ||
    authError?.message?.includes('Invalid Refresh Token') ||
    authError?.message?.includes('refresh_token')

  console.error('[v0] Auth error detected:', {
    code: authError?.code,
    message: authError?.message,
    isRefreshTokenError,
  })

  if (isRefreshTokenError) {
    const response = NextResponse.json(
      {
        error: 'Seans je iztekla. Prosim, se ponovno prijavite.',
        code: 'session_expired',
      },
      { status: 401 }
    )

    // Clear invalid tokens
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')

    return response
  }

  // Generic auth error
  return NextResponse.json(
    { error: 'Nepooblaščen dostop.' },
    { status: 401 }
  )
}

/**
 * Wrap API route auth checks with automatic error handling.
 * Usage:
 *   const result = await wrapAuthCheck(async () => {
 *     const supabase = await createClient()
 *     const { data: { user } } = await supabase.auth.getUser()
 *     if (!user) throw new Error('Not authenticated')
 *     return user
 *   })
 */
export async function wrapAuthCheck<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, response: handleAuthError(error) }
  }
}
