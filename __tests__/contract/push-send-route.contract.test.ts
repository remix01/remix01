import { POST } from '@/app/api/push/send/route'

const orchestratorMock = jest.fn()

jest.mock('@/lib/notifications/orchestration-service', () => ({
  sendOrchestratedNotification: (...args: any[]) => orchestratorMock(...args),
}))

describe('push send route contract', () => {
  beforeEach(() => {
    orchestratorMock.mockReset()
  })

  it('validates required fields', async () => {
    const response = await POST(new Request('http://localhost/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', title: 'Hello' }),
    }) as any)

    expect(response.status).toBe(400)
  })

  it('returns correlation and attempts from orchestration result', async () => {
    orchestratorMock.mockResolvedValue({
      success: true,
      correlationId: 'corr-1',
      attempts: [{ channel: 'push', success: true, attempt: 1 }],
    })

    const response = await POST(new Request('http://localhost/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', title: 'Hello', message: 'World' }),
    }) as any)

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json).toMatchObject({ sent: 1, failed: 0, correlationId: 'corr-1' })
    expect(Array.isArray(json.attempts)).toBe(true)
  })
})
