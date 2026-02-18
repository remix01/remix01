import { TokenService } from './token-service'

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, any>
}

export interface IPushService {
  send(tokens: string[], message: PushMessage): Promise<void>
}

/**
 * Expo Push Notification Service
 * Sends push notifications via Expo Push API
 */
export class ExpoPushService implements IPushService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
  private readonly BATCH_SIZE = 100

  async send(tokens: string[], message: PushMessage): Promise<void> {
    if (tokens.length === 0) return

    // Split into batches of 100 (Expo limit)
    const batches = this.chunkArray(tokens, this.BATCH_SIZE)

    for (const batch of batches) {
      await this.sendBatch(batch, message)
    }
  }

  private async sendBatch(tokens: string[], message: PushMessage): Promise<void> {
    const messages = tokens.map((token) => ({
      to: token,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
      priority: 'high',
    }))

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      })

      if (!response.ok) {
        throw new Error(`Expo push failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Handle errors and deactivate invalid tokens
      if (result.data) {
        for (let i = 0; i < result.data.length; i++) {
          const receipt = result.data[i]
          if (receipt.status === 'error') {
            if (
              receipt.details?.error === 'DeviceNotRegistered' ||
              receipt.message?.includes('not registered')
            ) {
              await TokenService.deactivate(tokens[i])
            }
          }
        }
      }
    } catch (error) {
      console.error('[ExpoPushService] Failed to send batch:', error)
      throw error
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Web Push Notification Service (stub)
 * TODO: Implement Web Push API (VAPID keys, service worker)
 */
export class WebPushService implements IPushService {
  async send(tokens: string[], message: PushMessage): Promise<void> {
    console.warn('[WebPushService] Web push not yet implemented')
    console.log(`Would send to ${tokens.length} web tokens:`, message)
    // TODO: Implement Web Push API with VAPID keys
  }
}

/**
 * Factory function to get the appropriate push service
 * Reads PUSH_PROVIDER from environment variables
 */
export function getPushService(): IPushService {
  const provider = process.env.PUSH_PROVIDER || 'expo'

  switch (provider.toLowerCase()) {
    case 'expo':
      return new ExpoPushService()
    case 'web':
      return new WebPushService()
    default:
      console.warn(`Unknown push provider: ${provider}, defaulting to Expo`)
      return new ExpoPushService()
  }
}
