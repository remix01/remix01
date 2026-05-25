import { env } from '@/lib/env'

function parseBaseUrl(): URL {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()

  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed
      }
    } catch {}
  }

  return new URL('https://liftgo.net')
}

export function buildOAuthCallbackUrl(params?: { next?: string; intendedRole?: 'narocnik' | 'obrtnik' }): string {
  const base = parseBaseUrl()
  const callback = new URL('/auth/callback', base)

  if (params?.next && params.next.startsWith('/') && !params.next.startsWith('//')) {
    callback.searchParams.set('next', params.next)
  }

  if (params?.intendedRole === 'narocnik' || params?.intendedRole === 'obrtnik') {
    callback.searchParams.set('role', params.intendedRole)
  }

  return callback.toString()
}

export function getSafeNextPath(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.startsWith('/auth/callback')) return null
  return value
}
