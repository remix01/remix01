/**
 * Job Queue — Async side effects via Upstash Redis
 * 
 * All escrow operations have side effects (emails, webhooks, auditing, etc).
 * This queue decouples them from the HTTP request so operations complete faster
 * and failures don't crash the main transaction.
 * 
 * Features:
 * - Idempotent job processing (Redis dedup + metadata)
 * - Exponential backoff for retries
 * - Dead-letter queue for persistent failures
 * - Type-safe job definitions
 * - Observable status tracking
 */

import { Redis } from '@upstash/redis'

// ── TYPES
export type JobType =
  | 'send_release_email'
  | 'send_refund_email'
  | 'send_dispute_email'
  | 'send_payment_confirmed_email'
  | 'notify_dispute_resolved'
  | 'stripe_capture_payment'
  | 'stripe_refund_payment'
  | 'audit_log_created'
  | 'webhook_escrow_status_changed'

export interface Job<T = any> {
  id: string
  type: JobType
  payload: T
  createdAt: number
  attemptCount: number
  maxAttempts: number
  nextRetry?: number
  lastError?: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter'
}

// ── REDIS CLIENT
let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    
    if (!url || !token) {
      throw new Error('Missing Upstash Redis credentials: KV_REST_API_URL, KV_REST_API_TOKEN')
    }
    
    redis = new Redis({ url, token })
  }
  return redis
}

// ── ENQUEUE JOB
/**
 * Add a job to the queue. Returns job ID for tracking.
 * 
 * Usage:
 * ```ts
 * const jobId = await enqueueJob('send_release_email', {
 *   transactionId: 'escrow-123',
 *   recipientEmail: 'user@example.com',
 * })
 * ```
 */
export async function enqueueJob<T extends Record<string, any>>(
  type: JobType,
  payload: T,
  options?: {
    maxAttempts?: number
    dedupeKey?: string // e.g., `escrow-${escrowId}-release` to prevent duplicates
  }
): Promise<string> {
  const client = getRedis()
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const job: Job<T> = {
    id: jobId,
    type,
    payload,
    createdAt: Date.now(),
    attemptCount: 0,
    maxAttempts: options?.maxAttempts ?? 3,
    status: 'queued',
  }
  
  // Store job metadata
  await client.set(
    `job:${jobId}`,
    JSON.stringify(job),
    { ex: 86400 } // Expire after 24 hours
  )
  
  // Add to queue list (FIFO)
  await client.lpush(`queue:${type}`, jobId)
  
  // Deduplication: if a dedupeKey is provided, track it
  if (options?.dedupeKey) {
    const dedupeId = `dedupe:${type}:${options.dedupeKey}`
    await client.set(dedupeId, jobId, { ex: 3600 }) // 1 hour dedupe window
  }
  
  console.log(`[JOB ENQUEUED] ${type} (${jobId})`, { payload })
  return jobId
}

// ── DEQUEUE & PROCESS
/**
 * Dequeue and process the next job of a given type.
 * This should be called by a scheduled task or background worker.
 * 
 * Returns the job that was processed, or null if queue is empty.
 */
export async function dequeueAndProcess(
  type: JobType,
  processor: (job: Job) => Promise<void>
): Promise<Job | null> {
  const client = getRedis()
  
  // Pop from queue (FIFO)
  const jobId = (await client.rpop(`queue:${type}`)) as string | null
  if (!jobId) {
    return null // Queue empty
  }
  
  // Fetch full job
  const jobJson = await client.get(`job:${jobId}`)
  if (!jobJson) {
    console.warn(`[JOB MISSING] Job ${jobId} not found in storage`)
    return null
  }
  
  const job = JSON.parse(jobJson as string) as Job
  
  try {
    // Mark as processing
    job.status = 'processing'
    await client.set(`job:${jobId}`, JSON.stringify(job))
    
    // Execute processor
    await processor(job)
    
    // Mark as completed
    job.status = 'completed'
    await client.set(`job:${jobId}`, JSON.stringify(job), { ex: 3600 })
    console.log(`[JOB COMPLETED] ${type} (${jobId})`)
    
    return job
    
  } catch (error: any) {
    job.attemptCount += 1
    job.lastError = error?.message ?? String(error)
    
    if (job.attemptCount >= job.maxAttempts) {
      // Max retries exceeded — move to dead letter queue
      job.status = 'dead_letter'
      await client.set(`job:${jobId}`, JSON.stringify(job), { ex: 604800 }) // 7 days
      await client.lpush(`queue:dead_letter`, jobId)
      console.error(`[JOB FAILED] ${type} (${jobId}) — moved to DLQ after ${job.attemptCount} attempts`, error)
      
    } else {
      // Retry with exponential backoff
      const delayMs = Math.pow(2, job.attemptCount) * 1000 // 1s, 2s, 4s
      job.nextRetry = Date.now() + delayMs
      job.status = 'queued'
      await client.set(`job:${jobId}`, JSON.stringify(job))
      
      // Re-enqueue at the back
      await client.lpush(`queue:${type}`, jobId)
      console.warn(`[JOB RETRY] ${type} (${jobId}) — attempt ${job.attemptCount}/${job.maxAttempts}, retry in ${delayMs}ms`, error)
    }
    
    return job
  }
}

// ── CHECK JOB STATUS
/**
 * Get current status of a job by ID.
 */
export async function getJobStatus(jobId: string): Promise<Job | null> {
  const client = getRedis()
  const jobJson = await client.get(`job:${jobId}`)
  if (!jobJson) return null
  return JSON.parse(jobJson as string) as Job
}

// ── GET QUEUE LENGTH
/**
 * Get pending jobs count for a queue type.
 */
export async function getQueueLength(type: JobType): Promise<number> {
  const client = getRedis()
  const count = await client.llen(`queue:${type}`)
  return count ?? 0
}

// ── LIST DEAD LETTER QUEUE
/**
 * Get all jobs in the dead letter queue.
 */
export async function getDeadLetterJobs(limit = 100): Promise<Job[]> {
  const client = getRedis()
  const range = await client.lrange(`queue:dead_letter`, 0, limit - 1)
  if (!range || range.length === 0) return []
  
  const jobs: Job[] = []
  for (const jobId of range as string[]) {
    const jobJson = await client.get(`job:${jobId}`)
    if (jobJson) {
      jobs.push(JSON.parse(jobJson as string))
    }
  }
  return jobs
}

// ── STATS
/**
 * Get queue statistics for monitoring.
 */
export async function getQueueStats(): Promise<{
  [key in JobType]: number
} & { dead_letter: number }> {
  const client = getRedis()
  const stats: any = { dead_letter: 0 }
  
  const types: JobType[] = [
    'send_release_email',
    'send_refund_email',
    'send_dispute_email',
    'send_payment_confirmed_email',
    'notify_dispute_resolved',
    'stripe_capture_payment',
    'stripe_refund_payment',
    'audit_log_created',
    'webhook_escrow_status_changed',
  ]
  
  for (const type of types) {
    stats[type] = (await client.llen(`queue:${type}`)) ?? 0
  }
  
  stats.dead_letter = (await client.llen(`queue:dead_letter`)) ?? 0
  
  return stats
}

// ── CLEAR QUEUE (for testing)
export async function clearQueue(type: JobType): Promise<void> {
  const client = getRedis()
  const key = `queue:${type}`
  
  // Get all items and delete their metadata
  const range = await client.lrange(key, 0, -1)
  if (range) {
    for (const jobId of range as string[]) {
      await client.del(`job:${jobId}`)
    }
  }
  
  // Clear the queue itself
  await client.del(key)
}

