
function normalizeOrigin(input?: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function getCanonicalAppOrigin(fallbackOrigin?: string | null): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ?? normalizeOrigin(fallbackOrigin) ?? 'http://localhost:3000'
}

export function getOAuthRedirectTo(path = '/auth/callback', fallbackOrigin?: string | null): string {
  const canonicalOrigin = getCanonicalAppOrigin(fallbackOrigin)
  return new URL(path, `${canonicalOrigin}/`).toString()
}

export function getSafeInternalRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback
  if (!target.startsWith('/')) return fallback
  if (target.startsWith('//')) return fallback
  if (target.startsWith('/prijava')) return fallback
  return target
}


export function buildOAuthCallbackUrl(params?: { provider?: string | null; role?: 'narocnik' | 'obrtnik' | null; next?: string | null; origin?: string | null }): string {
  const provider = params?.provider?.trim() || 'google'
  const role = params?.role === 'obrtnik' ? 'obrtnik' : 'narocnik'
  const next = getSafeInternalRedirect(params?.next)
  const callbackPath = `/auth/callback?provider=${encodeURIComponent(provider)}&role=${encodeURIComponent(role)}&next=${encodeURIComponent(next)}`
  return getOAuthRedirectTo(callbackPath, params?.origin)
}
