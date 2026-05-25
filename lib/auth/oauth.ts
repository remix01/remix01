import { env } from '@/lib/env'

const PROD_HOST = 'liftgo.net'
const PROD_WWW_HOST = 'www.liftgo.net'

function parseBaseUrl(): URL {
  try {
    const parsed = new URL(env.NEXT_PUBLIC_APP_URL)
    if (parsed.protocol === 'https:' && (parsed.hostname === PROD_HOST || parsed.hostname === PROD_WWW_HOST || parsed.hostname.endsWith('.vercel.app'))) {
      return parsed
    }
  } catch {}

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
