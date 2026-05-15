import { NextRequest, NextResponse } from 'next/server'

const mockInsert = jest.fn()
const mockSelectEqMaybeSingle = jest.fn()
const mockUpdateEq = jest.fn()
const mockDeleteEq = jest.fn()

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'idempotency_keys') {
        return {
          insert: mockInsert,
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mockSelectEqMaybeSingle,
              }),
            }),
          }),
          update: () => ({
            eq: mockUpdateEq,
          }),
          delete: () => ({
            eq: mockDeleteEq,
          }),
        }
      }
      return {}
    },
  },
}))

import { withIdempotency } from '@/lib/idempotency/withIdempotency'

function makeRequest(key?: string, opts?: { auth?: string; path?: string }): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers['idempotency-key'] = key
  if (opts?.auth) headers['authorization'] = opts.auth
  const url = `http://localhost${opts?.path ?? '/api/test'}`
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ test: true }),
  })
}

describe('withIdempotency', () => {
  const handler = jest.fn(async () =>
    NextResponse.json({ result: 'ok' }, { status: 200 }),
  )

  beforeEach(() => {
    handler.mockClear()
    mockInsert.mockReset()
    mockSelectEqMaybeSingle.mockReset()
    mockUpdateEq.mockReset()
    mockDeleteEq.mockReset()
  })

  it('passes through when no Idempotency-Key header is present', async () => {
    const wrapped = withIdempotency(handler)
    const req = makeRequest()

    const response = await wrapped(req)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('returns 400 when required and no key provided', async () => {
    const wrapped = withIdempotency(handler, { required: true })
    const req = makeRequest()

    const response = await wrapped(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Idempotency-Key')
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid key format', async () => {
    const wrapped = withIdempotency(handler)
    const req = makeRequest('ab') // too short

    const response = await wrapped(req)
    expect(response.status).toBe(400)
    expect(handler).not.toHaveBeenCalled()
  })

  it('replays cached response for duplicate key', async () => {
    mockSelectEqMaybeSingle.mockResolvedValue({
      data: {
        response_status: 201,
        response_body: { id: 'abc123' },
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    const wrapped = withIdempotency(handler)
    const req = makeRequest('test-key-12345678')

    const response = await wrapped(req)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBe('abc123')
    expect(response.headers.get('Idempotency-Replayed')).toBe('true')
    expect(handler).not.toHaveBeenCalled()
  })

  it('executes handler and caches result for new key', async () => {
    // No cached response
    mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
    // Lock acquired
    mockInsert.mockResolvedValue({ error: null })
    // Cache write succeeds
    mockUpdateEq.mockResolvedValue({ error: null })

    const wrapped = withIdempotency(handler)
    const req = makeRequest('new-key-12345678')

    const response = await wrapped(req)
    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(mockUpdateEq).toHaveBeenCalledTimes(1)
  })

  it('returns 409 when another request with same key is in progress', async () => {
    // No cached response
    mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
    // Lock fails (unique constraint)
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

    const wrapped = withIdempotency(handler)
    const req = makeRequest('busy-key-12345678')

    const response = await wrapped(req)
    expect(response.status).toBe(409)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 503 when lock acquisition fails due to DB error (fail closed)', async () => {
    // No cached response
    mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
    // Lock fails with non-duplicate DB error
    mockInsert.mockResolvedValue({ error: { code: '42P01', message: 'relation does not exist' } })

    const wrapped = withIdempotency(handler)
    const req = makeRequest('db-fail-key-12345')

    const response = await wrapped(req)
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error).toContain('unavailable')
    expect(handler).not.toHaveBeenCalled()
  })

  it('releases lock if handler throws', async () => {
    mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })

    const failingHandler = jest.fn(async () => {
      throw new Error('Handler exploded')
    })

    const wrapped = withIdempotency(failingHandler)
    const req = makeRequest('fail-key-12345678')

    await expect(wrapped(req)).rejects.toThrow('Handler exploded')
    expect(mockDeleteEq).toHaveBeenCalledTimes(1)
  })

  it('expires cached keys older than 24h', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockSelectEqMaybeSingle.mockResolvedValue({
      data: {
        response_status: 200,
        response_body: { old: true },
        created_at: oldDate,
      },
      error: null,
    })
    // After expiry, treat as new → lock acquired
    mockInsert.mockResolvedValue({ error: null })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })

    const wrapped = withIdempotency(handler)
    const req = makeRequest('expired-key-123456')

    const response = await wrapped(req)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  describe('endpoint + actor scoping', () => {
    it('scopes keys by path — same raw key on different paths does not replay', async () => {
      // First call: cache a response on /api/escrow/create
      mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockInsert.mockResolvedValue({ error: null })
      mockUpdateEq.mockResolvedValue({ error: null })

      const wrapped = withIdempotency(handler)
      const req1 = makeRequest('shared-key-123456', { path: '/api/escrow/create' })
      await wrapped(req1)

      // The scoped key used for insert includes the path
      const insertedKey1 = mockInsert.mock.calls[0]?.[0]?.key as string
      expect(insertedKey1).toContain('/api/escrow/create')

      // Second call: same raw key, different path
      mockInsert.mockReset()
      mockInsert.mockResolvedValue({ error: null })
      mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })

      const req2 = makeRequest('shared-key-123456', { path: '/api/escrow/release' })
      await wrapped(req2)

      const insertedKey2 = mockInsert.mock.calls[0]?.[0]?.key as string
      expect(insertedKey2).toContain('/api/escrow/release')
      expect(insertedKey1).not.toBe(insertedKey2)
    })

    it('scopes keys by auth — same raw key from different users does not replay', async () => {
      mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockInsert.mockResolvedValue({ error: null })
      mockUpdateEq.mockResolvedValue({ error: null })

      const wrapped = withIdempotency(handler)

      const reqUser1 = makeRequest('shared-key-123456', { auth: 'Bearer token-user-1' })
      await wrapped(reqUser1)
      const key1 = mockInsert.mock.calls[0]?.[0]?.key as string

      mockInsert.mockReset()
      mockInsert.mockResolvedValue({ error: null })
      mockSelectEqMaybeSingle.mockResolvedValue({ data: null, error: null })

      const reqUser2 = makeRequest('shared-key-123456', { auth: 'Bearer token-user-2' })
      await wrapped(reqUser2)
      const key2 = mockInsert.mock.calls[0]?.[0]?.key as string

      expect(key1).not.toBe(key2)
    })
  })
})
