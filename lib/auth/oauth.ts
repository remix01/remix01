const PROD_CANONICAL_URL = 'https://liftgo.net'

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

export function getCanonicalAppOrigin(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ?? PROD_CANONICAL_URL
}

export function getOAuthRedirectTo(path = '/auth/callback'): string {
  const canonicalOrigin = getCanonicalAppOrigin()
  return new URL(path, `${canonicalOrigin}/`).toString()
}

export function getSafeInternalRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback
  if (!target.startsWith('/')) return fallback
  if (target.startsWith('//')) return fallback
  if (target.startsWith('/prijava')) return fallback
  return target
}
