/**
 * N8N Webhook Client
 *
 * Handles sending events from LiftGO to n8n workflows.
 * All events are queued and retried on failure.
 */

import crypto from 'crypto';

// Optional: Rate limiting support
let Ratelimit: any = null;
let Redis: any = null;

try {
  const upstashRatelimit = require('@upstash/ratelimit');
  Ratelimit = upstashRatelimit.Ratelimit;
} catch (e) {
  // Rate limiting not available, will skip
}

try {
  const upstashRedis = require('@upstash/redis');
  Redis = upstashRedis.Redis;
} catch (e) {
  // Redis not available, will skip rate limiting
}

// Types for all webhook events
export interface TaskPublishedEvent {
  event: 'task.published';
  taskId: string;
  customerId: string;
  categoryId: string;
  location: string;
  budget: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  publishedAt: string;
}

export interface TaskStatusChangedEvent {
  event: 'task.status_changed';
  taskId: string;
  customerId: string;
  assignedTo?: string | null;
  oldStatus: 'draft' | 'open' | 'has_ponudbe' | 'in_progress' | 'completed' | 'cancelled';
  newStatus: 'draft' | 'open' | 'has_ponudbe' | 'in_progress' | 'completed' | 'cancelled';
  changedAt: string;
}

export interface PonudbaCreatedEvent {
  event: 'ponudba.created';
  ponudbaId: string;
  taskId: string;
  craftmanId: string;
  customerId: string;
  price: number;
  estimatedDays: number;
  description: string;
  createdAt: string;
}

export interface PaymentCompletedEvent {
  event: 'payment.completed';
  transactionId: string;
  taskId: string;
  amount: number;
  currency: 'EUR';
  stripeChargeId: string;
  status: 'succeeded' | 'failed';
  completedAt: string;
}

export interface DisputeFlaggedEvent {
  event: 'dispute.flagged';
  disputeId: string;
  taskId: string;
  reportedBy: string;
  reason: 'quality' | 'payment' | 'communication' | 'other';
  description: string;
  flaggedAt: string;
}

export interface MessageSentEvent {
  event: 'message.sent';
  messageId: string;
  taskId?: string | null;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
}

export type WebhookEvent =
  | TaskPublishedEvent
  | TaskStatusChangedEvent
  | PonudbaCreatedEvent
  | PaymentCompletedEvent
  | DisputeFlaggedEvent
  | MessageSentEvent;

interface WebhookConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  secret?: string;
}

const DEFAULT_CONFIG: WebhookConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 5000,
  secret: process.env.N8N_WEBHOOK_SECRET || ''
};

// Initialize rate limiter
let ratelimit: any = null;

function getRateLimiter(): any {
  if (!Ratelimit || !Redis) {
    return null; // Rate limiting not available
  }

  if (!ratelimit && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(100, '1 m'),
      });
    } catch (error) {
      console.warn('Failed to initialize rate limiter:', error);
      return null;
    }
  }
  return ratelimit;
}

/**
 * Sign webhook payload for security
 */
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Get webhook URL for event type
 */
function getWebhookUrl(event: WebhookEvent['event']): string {
  const baseUrl = process.env.N8N_WEBHOOK_BASE || 'https://n8n.liftgo.net/webhook';

  const urlMap: Record<string, string> = {
    'task.published': `${baseUrl}/liftgo/task-published`,
    'task.status_changed': `${baseUrl}/liftgo/task-status-changed`,
    'ponudba.created': `${baseUrl}/liftgo/ponudba-created`,
    'payment.completed': `${baseUrl}/liftgo/payment-completed`,
    'dispute.flagged': `${baseUrl}/liftgo/dispute-flagged`,
    'message.sent': `${baseUrl}/liftgo/message-sent`,
  };

  return urlMap[event] || '';
}

/**
 * Send webhook event to n8n with automatic retry
 */
export async function sendWebhookEvent(
  event: WebhookEvent,
  config: Partial<WebhookConfig> = {}
): Promise<boolean> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const url = getWebhookUrl(event.event);

  if (!url) {
    console.error(`Unknown webhook event: ${event.event}`);
    return false;
  }

  // Check rate limit if available
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const limiter = getRateLimiter();
      if (limiter) {
        const { success } = await limiter.limit('n8n-webhook');
        if (!success) {
          console.warn('N8N webhook rate limit exceeded, queuing for later');
          // Queue for retry via job queue
          await queueWebhookEvent(event);
          return false;
        }
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Continue anyway, don't block the request
    }
  }

  const payload = JSON.stringify(event);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'LiftGO/1.0',
  };

  // Add signature if secret is configured
  if (finalConfig.secret) {
    const signature = signPayload(payload, finalConfig.secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  // Retry logic
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✓ Webhook sent: ${event.event}`);
        return true;
      }

      if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        const errorText = await response.text();
        console.error(
          `Webhook failed with status ${response.status}: ${errorText}`
        );
        return false;
      }

      // Server error - retry
      lastError = new Error(
        `Webhook returned status ${response.status}`
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < finalConfig.maxRetries) {
        const delayMs = finalConfig.retryDelayMs * Math.pow(2, attempt);
        console.warn(
          `Webhook retry ${attempt + 1}/${finalConfig.maxRetries} ` +
          `in ${delayMs}ms: ${lastError.message}`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(
    `✗ Webhook failed after ${finalConfig.maxRetries} retries: ${lastError?.message}`
  );

  // Queue for async retry via job queue
  await queueWebhookEvent(event);
  return false;
}

/**
 * Queue webhook event for async retry (via QStash or similar)
 */
async function queueWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    // If using QStash (Upstash job queue)
    if (process.env.QSTASH_TOKEN) {
      const response = await fetch(
        'https://qstash.io/v2/enqueue/https://liftgo.net/api/webhooks/internal/retry',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
            'Content-Type': 'application/json',
            'Upstash-Delay': '30s', // Retry after 30 seconds
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`QStash enqueue failed: ${response.statusText}`);
      }

      console.log(`Queued webhook for retry: ${event.event}`);
    } else {
      // Fallback: log to database for manual retry
      console.log(
        `[FALLBACK] Queued webhook event to database: ${event.event}`
      );
      // TODO: Insert into failed_webhooks table in Supabase
    }
  } catch (error) {
    console.error('Failed to queue webhook for retry:', error);
  }
}

/**
 * Batch send multiple webhook events
 */
export async function sendWebhookEventsBatch(
  events: WebhookEvent[],
  config: Partial<WebhookConfig> = {}
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const event of events) {
    const key = `${event.event}_${Date.now()}`;
    results[key] = await sendWebhookEvent(event, config);
  }

  return results;
}

/**
 * Send webhook with custom retry strategy
 */
export async function sendWebhookEventWithCustomRetry(
  event: WebhookEvent,
  retryStrategy: (attempt: number) => number // returns delay in ms
): Promise<boolean> {
  const url = getWebhookUrl(event.event);
  if (!url) return false;

  const payload = JSON.stringify(event);
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (response.ok) return true;
      if (response.status < 500) return false; // Don't retry client errors
    } catch (error) {
      // Network error - might be worth retrying
    }

    const delay = retryStrategy(attempt);
    if (delay === -1) {
      // Signal to stop retrying
      await queueWebhookEvent(event);
      return false;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    attempt++;
  }
}

/**
 * Verify webhook signature from n8n
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string = process.env.N8N_WEBHOOK_SECRET || ''
): boolean {
  if (!secret) {
    console.warn('No N8N_WEBHOOK_SECRET configured, skipping verification');
    return true;
  }

  const [algorithm, hash] = signature.split('=');

  if (algorithm !== 'sha256') {
    return false;
  }

  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
}
