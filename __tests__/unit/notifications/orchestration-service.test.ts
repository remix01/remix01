import { sendOrchestratedNotification } from '@/lib/notifications/orchestration-service'

jest.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: { create: jest.fn(async () => ({ id: 'n1' })) },
}))

jest.mock('@/lib/push/token-service', () => ({
  TokenService: { getForUser: jest.fn(async () => [{ token: 'ExponentPushToken[1]' }]) },
}))

const sendMock = jest.fn(async () => undefined)

jest.mock('@/lib/push/web-subscription-service', () => ({
  sendWebPushToUser: jest.fn(async () => ({ sent: 0, failed: 0 })),
}))

jest.mock('@/lib/push/push-service', () => ({
  getPushService: () => ({ send: sendMock }),
}))

jest.mock('@/lib/notifications/delivery-log', () => ({
  deliveryLog: {
    write: jest.fn(async () => undefined),
  },
}))

jest.mock('@/lib/monitoring/alerting', () => ({
  alerting: {
    send: jest.fn(async () => undefined),
  },
}))

jest.mock('@/lib/events/idempotency', () => ({
  idempotency: {
    checkAndMark: jest.fn(async () => false),
  },
}))

jest.useFakeTimers()

describe('sendOrchestratedNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses fallback channel when push fails', async () => {
    sendMock.mockRejectedValue(new Error('push down'))

    const promise = sendOrchestratedNotification({
      userId: 'u1',
      type: 'SYSTEM',
      title: 't',
      body: 'b',
      preferredChannels: ['push'],
      fallbackChannels: ['in_app'],
    })

    // Advance through all exponential backoff timers so the test runs instantly
    await jest.runAllTimersAsync()

    const result = await promise

    expect(result.success).toBe(true)
    expect(result.attempts.some((a) => a.channel === 'in_app' && a.success)).toBe(true)
  })

  it('returns success on first in_app attempt', async () => {
    const result = await sendOrchestratedNotification({
      userId: 'u2',
      type: 'NEW_MESSAGE',
      title: 'Message',
      body: 'Hello',
      preferredChannels: ['in_app'],
    })

    expect(result.success).toBe(true)
    expect(result.attempts[0]).toMatchObject({ channel: 'in_app', success: true, attempt: 1 })
  })

  it('skips duplicate when idempotencyKey already processed', async () => {
    const { idempotency } = jest.requireMock('@/lib/events/idempotency')
    idempotency.checkAndMark.mockResolvedValueOnce(true) // already processed

    const result = await sendOrchestratedNotification({
      userId: 'u3',
      type: 'SYSTEM',
      title: 't',
      body: 'b',
      idempotencyKey: 'key-already-seen',
    })

    expect(result.success).toBe(true)
    expect((result as any).skipped).toBe(true)
    expect(result.attempts).toHaveLength(0)
  })

  it('returns failure when no_push_targets and no fallback', async () => {
    const { TokenService } = jest.requireMock('@/lib/push/token-service')
    const { sendWebPushToUser } = jest.requireMock('@/lib/push/web-subscription-service')
    TokenService.getForUser.mockResolvedValueOnce([])
    sendWebPushToUser.mockResolvedValueOnce({ sent: 0, failed: 0 })

    const result = await sendOrchestratedNotification({
      userId: 'u4',
      type: 'SYSTEM',
      title: 't',
      body: 'b',
      preferredChannels: ['push'],
      fallbackChannels: [],
    })

    expect(result.success).toBe(false)
    // Non-retryable: only 1 attempt, not 3
    expect(result.attempts.filter((a) => a.channel === 'push')).toHaveLength(1)
  })
})
