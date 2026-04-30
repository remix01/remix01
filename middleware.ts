import type { NextRequest } from 'next/server'
import { proxy, config } from './proxy'
import { getRobotsHeaderValue } from '@/lib/seo-indexing'

export { config }

export async function middleware(request: NextRequest) {
  const response = await proxy(request)

  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')

  const robotsHeader = getRobotsHeaderValue(request.nextUrl.pathname)

  if (robotsHeader) {
    response.headers.set('x-robots-tag', robotsHeader)
  } else {
    response.headers.delete('x-robots-tag')
  }

  return response
}
