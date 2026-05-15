/**
 * HTTP-level Idempotency Guard for mutation endpoints.
 *
 * Clients send `Idempotency-Key: <uuid>` on POST/PUT/PATCH requests.
 * On the first call the handler runs normally and its JSON response is
 * cached in `idempotency_keys`.  Subsequent calls with the same key
 * return the cached response without re-executing the handler.
 *
 * Keys are scoped to method + path + caller so the same raw key from
 * different endpoints or users never collides.
 *
 * Keys expire after 24 hours.
 *
 * Usage:
 *   export const POST = withIdempotency(async (req) => { ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const IDEMPOTENCY_HEADER = 'idempotency-key'
const KEY_TTL_MS = 24 * 60 * 60 * 1000

type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse | Response>

export interface IdempotencyOptions {
  required?: boolean
}

/**
 * Build a scoped key that includes method, path, and caller identity
 * so the same raw Idempotency-Key from different endpoints/users
 * never replays another request's cached response.
 */
function buildScopedKey(req: NextRequest, rawKey: string): string {
  const method = req.method
  const path = req.nextUrl.pathname
  // Use Authorization header hash as caller fingerprint (works for both
  // Bearer tokens and cookie-based auth forwarded by middleware)
  const authHeader = req.headers.get('authorization') ?? ''
  const callerFingerprint = authHeader
    ? simpleHash(authHeader)
    : 'anon'
  return `${method}:${path}:${callerFingerprint}:${rawKey}`
}

/** Fast non-crypto hash — sufficient for key scoping, not for security. */
function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export function withIdempotency(
  handler: RouteHandler,
  options: IdempotencyOptions = {},
): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    const rawKey = req.headers.get(IDEMPOTENCY_HEADER)

    if (!rawKey) {
      if (options.required) {
        return NextResponse.json(
          { error: 'Idempotency-Key header is required for this endpoint' },
          { status: 400 },
        )
      }
      return handler(req, ctx)
    }

    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(rawKey)) {
      return NextResponse.json(
        { error: 'Invalid Idempotency-Key format (8-128 alphanumeric chars, dashes, underscores)' },
        { status: 400 },
      )
    }

    const key = buildScopedKey(req, rawKey)

    const cached = await getCachedResponse(key)
    if (cached) {
      return NextResponse.json(cached.response_body, {
        status: cached.response_status,
        headers: { 'Idempotency-Replayed': 'true' },
      })
    }

    const lockResult = await acquireLock(key)
    if (lockResult === 'duplicate') {
      return NextResponse.json(
        { error: 'A request with this Idempotency-Key is already in progress' },
        { status: 409 },
      )
    }
    if (lockResult === 'error') {
      // Fail closed: reject the request rather than silently disabling deduplication
      return NextResponse.json(
        { error: 'Idempotency service unavailable. Please retry.' },
        { status: 503 },
      )
    }

    try {
      const response = await handler(req, ctx)
      const clonedResponse = response.clone()

      let responseBody: unknown
      try {
        responseBody = await clonedResponse.json()
      } catch {
        responseBody = { _raw: true }
      }

      await cacheResponse(key, response.status, responseBody)

      return response
    } catch (err) {
      await releaseLock(key)
      throw err
    }
  }
}

async function getCachedResponse(key: string): Promise<{
  response_status: number
  response_body: unknown
} | null> {
  const { data, error } = await supabaseAdmin
    .from('idempotency_keys')
    .select('response_status, response_body, created_at')
    .eq('key', key)
    .eq('status', 'completed')
    .maybeSingle()

  if (error || !data) return null

  const createdAt = new Date(data.created_at).getTime()
  if (Date.now() - createdAt > KEY_TTL_MS) {
    await supabaseAdmin.from('idempotency_keys').delete().eq('key', key)
    return null
  }

  return data
}

async function acquireLock(key: string): Promise<'ok' | 'duplicate' | 'error'> {
  const { error } = await supabaseAdmin.from('idempotency_keys').insert({
    key,
    status: 'processing',
    created_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') {
      return 'duplicate'
    }
    console.error('[Idempotency] Lock acquisition failed — rejecting request:', error.message)
    return 'error'
  }

  return 'ok'
}

async function cacheResponse(
  key: string,
  status: number,
  body: unknown,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('idempotency_keys')
    .update({
      status: 'completed',
      response_status: status,
      response_body: body as Record<string, unknown>,
      completed_at: new Date().toISOString(),
    })
    .eq('key', key)

  if (error) {
    console.error('[Idempotency] Cache error:', error.message)
  }
}

async function releaseLock(key: string): Promise<void> {
  await supabaseAdmin.from('idempotency_keys').delete().eq('key', key)
}
