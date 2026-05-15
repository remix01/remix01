import { randomUUID } from 'crypto'
import { NotificationService, type NotificationType } from './notification-service'
import { TokenService } from '@/lib/push/token-service'
import { getPushService } from '@/lib/push/push-service'
import { recordMetric } from '@/lib/observability/notification-metrics'

export type NotificationChannel = 'in_app' | 'push'

export interface OrchestratedNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any>
  preferredChannels?: NotificationChannel[]
  fallbackChannels?: NotificationChannel[]
  correlationId?: string
}

export interface DeliveryAttempt {
  channel: NotificationChannel
  success: boolean
  error?: string
  attempt: number
}

export async function sendOrchestratedNotification(input: OrchestratedNotificationInput) {
  const correlationId = input.correlationId ?? randomUUID()
  const channels = input.preferredChannels ?? ['in_app', 'push']
  const fallbacks = input.fallbackChannels ?? ['in_app']
  const attempts: DeliveryAttempt[] = []

  const executeChannel = async (channel: NotificationChannel, attempt: number) => {
    try {
      if (channel === 'in_app') {
        const created = await NotificationService.create(input.userId, input.type, input.title, input.body, { ...input.data, correlationId })
        if (!created) throw new Error('in_app create returned null')
      } else {
        const tokens = await TokenService.getForUser(input.userId)
        if (tokens.length === 0) throw new Error('no_tokens')
        await getPushService().send(tokens.map((t: any) => t.token), { title: input.title, body: input.body, data: { ...input.data, correlationId } })
      }
      attempts.push({ channel, success: true, attempt })
      recordMetric('notification_channel_delivery', 1, { channel, status: 'success' })
      return true
    } catch (error) {
      attempts.push({ channel, success: false, attempt, error: error instanceof Error ? error.message : String(error) })
      recordMetric('notification_channel_delivery', 1, { channel, status: 'failure' })
      return false
    }
  }

  for (const channel of channels) {
    let delivered = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) recordMetric('notification_retry_attempt', 1, { channel, attempt: String(attempt) })
      delivered = await executeChannel(channel, attempt)
      if (delivered) break
      await new Promise((r) => setTimeout(r, 100 * attempt))
    }
    if (!delivered) {
      recordMetric('notification_retry_exhausted', 1, { channel })
      for (const fallback of fallbacks) {
        if (fallback === channel) continue
        if (await executeChannel(fallback, 1)) {
          return { success: true, correlationId, attempts }
        }
      }
    } else {
      return { success: true, correlationId, attempts }
    }
  }

  return { success: false, correlationId, attempts }
}
