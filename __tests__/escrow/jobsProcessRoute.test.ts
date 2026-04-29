import { NextRequest } from 'next/server'
import { POST } from '@/app/api/jobs/process/route'
import { processJob } from '@/lib/jobs/processor'

jest.mock('@/lib/jobs/processor', () => ({
  processJob: jest.fn(),
}))

jest.mock('@upstash/qstash/nextjs', () => ({
  verifySignatureAppRouter: (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      const signature = req.headers.get('upstash-signature')
      if (signature !== 'valid-signature') {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      }
      return handler(req)
    }
  },
}))

describe('POST /api/jobs/process', () => {
  const mockedProcessJob = processJob as jest.MockedFunction<typeof processJob>
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    mockedProcessJob.mockResolvedValue(undefined)
  })

  afterAll(() => {
    logSpy.mockRestore()
  })

  function createRequest(body: unknown, signature?: string, retries?: string, maxRetries?: string) {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (signature) headers.set('upstash-signature', signature)
    if (retries) headers.set('upstash-retries', retries)
    if (maxRetries) headers.set('upstash-max-retries', maxRetries)

    return new NextRequest('http://localhost:3000/api/jobs/process', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  it('returns 200 and processes job for valid signed request', async () => {
    const req = createRequest({ jobType: 'sendEmail', payload: { to: 'a@example.com' } }, 'valid-signature', '2', '3')

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockedProcessJob).toHaveBeenCalledWith('sendEmail', { data: { to: 'a@example.com' } })
    const successLog = logSpy.mock.calls.find(([msg, meta]) => msg === '[API] Processing job' && (meta as any)?.status === 'success')
    expect(successLog).toBeDefined()
  })

  it('returns 401 and does not process when signature is missing', async () => {
    const req = createRequest({ jobType: 'sendEmail', payload: { to: 'a@example.com' } })

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(mockedProcessJob).not.toHaveBeenCalled()
  })

  it('returns 401 and does not process when signature is invalid', async () => {
    const req = createRequest({ jobType: 'sendEmail', payload: { to: 'a@example.com' } }, 'bad-signature')

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(mockedProcessJob).not.toHaveBeenCalled()
  })

  it('returns 500 when processJob throws', async () => {
    mockedProcessJob.mockRejectedValueOnce(new Error('worker failed'))
    const req = createRequest({ jobType: 'sendEmail', payload: { to: 'a@example.com' } }, 'valid-signature')

    const res = await POST(req)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to process job' })
  })

  it('returns 500 for unknown job type errors', async () => {
    mockedProcessJob.mockRejectedValueOnce(new Error('Unknown job type: bogus'))
    const req = createRequest({ jobType: 'bogus', payload: { any: 'data' } }, 'valid-signature')

    const res = await POST(req)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to process job' })
  })

  it('returns 200 for successful job processing', async () => {
    const req = createRequest({ jobType: 'webhook', payload: { transactionId: 'txn_1' } }, 'valid-signature')

    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
