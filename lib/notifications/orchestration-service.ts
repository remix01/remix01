import { randomUUID } from 'crypto'
import { NotificationService, type NotificationType } from './notification-service'
import { TokenService } from '@/lib/push/token-service'
import { getPushService } from '@/lib/push/push-service'
import { recordMetric } from '@/lib/observability/notification-metrics'
import { sendWebPushToUser } from '@/lib/push/web-subscription-service'
import { deliveryLog } from './delivery-log'
import { alerting } from '@/lib/monitoring/alerting'
import { idempotency } from '@/lib/events/idempotency'

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
  // When provided, prevents duplicate sends across retries/restarts
  idempotencyKey?: string
}

export interface DeliveryAttempt {
  channel: NotificationChannel
  success: boolean
  error?: string
  attempt: number
  metadata?: Record<string, unknown>
}

// Errors that should not be retried — permanent state, not transient failures
const NON_RETRYABLE_ERRORS = new Set([
  'no_push_targets',  // User has no registered push subscriptions — won't change mid-retry
  'user_not_found',
  'invalid_user',
])

function isRetryable(error: string): boolean {
  return !NON_RETRYABLE_ERRORS.has(error)
}

// Exponential backoff: 1s, 2s, 4s
function backoffMs(attempt: number): number {
  return 1000 * Math.pow(2, attempt - 1)
}

export async function sendOrchestratedNotification(input: OrchestratedNotificationInput) {
  const correlationId = input.correlationId ?? randomUUID()
  const channels = input.preferredChannels ?? ['in_app', 'push']
  const fallbacks = input.fallbackChannels ?? ['in_app']
  const attempts: DeliveryAttempt[] = []
  const MAX_ATTEMPTS = 3

  // Idempotency guard — check only (no write yet).
  // We mark AFTER confirmed delivery so a transient failure doesn't consume
  // the key and turn a retryable error into a permanent silent drop.
  if (input.idempotencyKey) {
    const alreadySent = await idempotency.check(
      'notification',
      'orchestrate',
      input.idempotencyKey
    )
    if (alreadySent) {
      console.info(JSON.stringify({
        level: 'info',
        message: '[Orchestration] Skipped duplicate notification',
        correlationId,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
      }))
      return { success: true, correlationId, attempts, skipped: true }
    }
  }

  // Marks the idempotency key after a confirmed successful delivery.
  // Fire-and-forget: a missed mark means a possible duplicate send on the
  // next retry, which is acceptable — better than a silent drop.
  const markDelivered = () => {
    if (!input.idempotencyKey) return
    idempotency.mark('notification', 'orchestrate', input.idempotencyKey)
      .catch(() => {/* non-fatal */})
  }

  const executeChannel = async (channel: NotificationChannel, attempt: number) => {
    try {
      if (channel === 'in_app') {
        const created = await NotificationService.create(
          input.userId,
          input.type,
          input.title,
          input.body,
          { ...input.data, correlationId }
        )
        if (!created) throw new Error('in_app create returned null')
      } else {
        const tokens = await TokenService.getForUser(input.userId)
        let devicePushDelivered = false

        if (tokens.length > 0) {
          await getPushService().send(tokens.map((t: any) => t.token), {
            title: input.title,
            body: input.body,
            data: { ...input.data, correlationId },
          })
          devicePushDelivered = true
        }

        const webPushResult = await sendWebPushToUser({
          userId: input.userId,
          title: input.title,
          body: input.body,
          data: { ...input.data, correlationId },
        })

        if (!devicePushDelivered && webPushResult.sent === 0) {
          throw new Error('no_push_targets')
        }
      }

      attempts.push({ channel, success: true, attempt })
      recordMetric('notification_channel_delivery', 1, { channel, status: 'success' })
      // Fire-and-forget: delivery log is observability, not on the critical path
      deliveryLog.write({
        correlationId,
        userId: input.userId,
        channel,
        status: 'success',
        attemptCount: attempt,
      }).catch(() => {/* logged inside deliveryLog */})
      return { delivered: true, errorCode: null }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : String(error)
      attempts.push({ channel, success: false, attempt, error: errorCode })
      recordMetric('notification_channel_delivery', 1, { channel, status: 'failure' })
      console.warn(JSON.stringify({
        level: 'warn',
        message: '[Orchestration] Channel attempt failed',
        correlationId,
        userId: input.userId,
        channel,
        attempt,
        error: errorCode,
        retryable: isRetryable(errorCode),
      }))
      return { delivered: false, errorCode }
    }
  }

  for (const channel of channels) {
    let delivered = false
    let lastError: string | null = null
    let actualAttempts = 0

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      actualAttempts = attempt
      if (attempt > 1) {
        recordMetric('notification_retry_attempt', 1, { channel, attempt: String(attempt) })
      }

      const result = await executeChannel(channel, attempt)

      if (result.delivered) {
        delivered = true
        break
      }

      lastError = result.errorCode

      // Non-retryable errors: stop immediately, do not wait or retry
      if (lastError && !isRetryable(lastError)) {
        console.info(JSON.stringify({
          level: 'info',
          message: '[Orchestration] Non-retryable error, skipping channel',
          correlationId,
          channel,
          error: lastError,
        }))
        break
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, backoffMs(attempt)))
      }
    }

    if (!delivered) {
      recordMetric('notification_retry_exhausted', 1, { channel })
      deliveryLog.write({
        correlationId,
        userId: input.userId,
        channel,
        status: 'retry_exhausted',
        attemptCount: actualAttempts,
        lastError: lastError ?? 'unknown',
      }).catch(() => {/* logged inside deliveryLog */})

      // Try fallback channels before giving up
      for (const fallback of fallbacks) {
        if (fallback === channel) continue
        const fallbackResult = await executeChannel(fallback, 1)
        if (fallbackResult.delivered) {
          markDelivered()
          return { success: true, correlationId, attempts }
        }
      }
    } else {
      markDelivered()
      return { success: true, correlationId, attempts }
    }
  }

  // All channels and fallbacks exhausted — permanent failure
  const lastErrorStr = attempts.find((a) => !a.success)?.error ?? 'unknown'
  console.error(JSON.stringify({
    level: 'error',
    message: '[Orchestration] All channels exhausted — permanent failure',
    correlationId,
    userId: input.userId,
    channels,
    attempts: attempts.length,
    lastError: lastErrorStr,
  }))

  await alerting.send({
    type: 'notification_failure',
    severity: 'warn',
    message: `Notification delivery failed for user ${input.userId} (${input.type})`,
    metadata: { correlationId, userId: input.userId, type: input.type, lastError: lastErrorStr },
  }).catch(() => {/* alerting failure must not propagate */})

  return { success: false, correlationId, attempts }
}
