import { NextRequest } from 'next/server'

const validateAIRequestMock = jest.fn()
const executeSandboxCodeMock = jest.fn()

jest.mock('@/lib/ai/ai-security-middleware', () => ({
  validateAIRequest: (...args: unknown[]) => validateAIRequestMock(...args),
}))

jest.mock('@/lib/services/e2b-sandbox', () => ({
  executeSandboxCode: (...args: unknown[]) => executeSandboxCodeMock(...args),
  SandboxPolicyError: class SandboxPolicyError extends Error {
    reason: string
    status: number
    constructor(reason: string, message: string, status = 400) {
      super(message)
      this.reason = reason
      this.status = status
    }
  },
}))

describe('sandbox routes', () => {
  beforeEach(() => {
    validateAIRequestMock.mockReset()
    executeSandboxCodeMock.mockReset()
  })

  it('execute route rejects when auth fails', async () => {
    const { POST } = await import('@/app/api/sandbox/execute/route')
    validateAIRequestMock.mockResolvedValue({ error: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }) })

    const req = new NextRequest('http://localhost/api/sandbox/execute', {
      method: 'POST',
      body: JSON.stringify({ code: 'print(1)', language: 'python' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('execute route returns success payload', async () => {
    const { POST } = await import('@/app/api/sandbox/execute/route')
    validateAIRequestMock.mockResolvedValue({ context: { userId: 'u1', tier: 'start' } })
    executeSandboxCodeMock.mockResolvedValue({ sandboxId: 's1', stdout: 'ok', stderr: '', exitCode: 0, runtimeMs: 10, timedOut: false, truncated: { stdout: false, stderr: false } })

    const req = new NextRequest('http://localhost/api/sandbox/execute', {
      method: 'POST',
      body: JSON.stringify({ code: 'print(1)', language: 'python' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('chat route requires auth before stream', async () => {
    const { POST } = await import('@/app/api/sandbox/chat/route')
    validateAIRequestMock.mockResolvedValue({ error: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }) })

    const req = new NextRequest('http://localhost/api/sandbox/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
