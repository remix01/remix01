import type { NextRequest } from 'next/server'
import { proxy, config } from './proxy'

export { config }

export async function middleware(request: NextRequest) {
  const response = await proxy(request)

  const env = process.env.VERCEL_ENV || process.env.NODE_ENV
  const isProduction = env === 'production'

  if (isProduction) {
    response.headers.delete('x-robots-tag')
  } else {
    response.headers.set('x-robots-tag', 'noindex, nofollow')
  }

  return response
}
