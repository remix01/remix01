import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set(
  process.env.NODE_ENV === 'production'
    ? ['https://liftgo.net', 'https://www.liftgo.net']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://liftgo.net']
)

// Routes with their own request signing — skip CSRF for these
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',
  '/api/jobs/process',
  '/api/cron/',
  '/api/slack',
]

export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function validateCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')

  // Requests without Origin (e.g. server-to-server) are allowed only for exempt routes
  if (!origin) return false

  try {
    const { origin: parsedOrigin } = new URL(origin)
    return ALLOWED_ORIGINS.has(parsedOrigin)
  } catch {
    return false
  }
}

export function csrfForbidden(): NextResponse {
  return NextResponse.json(
    { error: 'Neveljavna zahteva — CSRF zaščita.', code: 'CSRF_INVALID' },
    { status: 403 }
  )
}
