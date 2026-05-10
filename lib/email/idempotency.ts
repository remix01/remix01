/**
 * Idempotency key generation utilities for email sending
 * Separated from resend-utils to avoid Server Action constraints
 */

/**
 * Generate idempotency key for single emails
 * Format: <event-type>/<entity-id>
 * Example: welcome-email/user-123
 */
export function generateIdempotencyKey(eventType: string, entityId: string): string {
  if (!eventType || !entityId) {
    throw new Error('eventType and entityId are required for idempotency key')
  }
  const key = `${eventType}/${entityId}`
  if (key.length > 256) {
    throw new Error(`Idempotency key exceeds 256 character limit: ${key.length}`)
  }
  return key
}

/**
 * Generate batch idempotency key
 * Format: batch-<event-type>/<batch-id>
 * Example: batch-orders/batch-456
 */
export function generateBatchIdempotencyKey(
  eventType: string,
  batchId: string
): string {
  const key = `batch-${eventType}/${batchId}`
  if (key.length > 256) {
    throw new Error(`Batch idempotency key exceeds 256 character limit: ${key.length}`)
  }
  return key
}
