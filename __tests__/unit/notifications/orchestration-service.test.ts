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

describe('sendOrchestratedNotification', () => {
  it('uses fallback channel when push fails', async () => {
    sendMock.mockRejectedValue(new Error('push down'))
    const result = await sendOrchestratedNotification({
      userId: 'u1',
      type: 'SYSTEM',
      title: 't',
      body: 'b',
      preferredChannels: ['push'],
      fallbackChannels: ['in_app'],
    })

    expect(result.success).toBe(true)
    expect(result.attempts.some((a) => a.channel === 'in_app' && a.success)).toBe(true)
  })
})
