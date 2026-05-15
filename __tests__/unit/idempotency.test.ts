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

function makeRequest(key?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers['idempotency-key'] = key
  return new NextRequest('http://localhost/api/test', {
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
})
