import type { NextRequest } from 'next/server'
import { proxy, config } from './proxy'

export { config }

const NOINDEX_PATH_PREFIXES = ['/admin', '/auth', '/api']

function shouldNoindex(pathname: string, isProduction: boolean): boolean {
  if (!isProduction) return true
  return NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const response = await proxy(request)

  const env = process.env.VERCEL_ENV || process.env.NODE_ENV
  const isProduction = env === 'production'

  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')

  if (shouldNoindex(request.nextUrl.pathname, isProduction)) {
    response.headers.set('x-robots-tag', 'noindex, nofollow')
  } else {
    response.headers.delete('x-robots-tag')
  }

  return response
}
