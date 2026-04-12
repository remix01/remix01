import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse | Response>

/**
 * Wraps a Next.js route handler so unhandled errors are captured by Sentry
 * before re-throwing (which lets Next.js return a 500 response).
 *
 * Usage:
 *   export const POST = withSentry(async (req) => { ... })
 */
export function withSentry(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      Sentry.captureException(err, {
        contexts: {
          request: {
            method: req.method,
            url: req.url,
          },
        },
      })
      throw err
    }
  }
}
