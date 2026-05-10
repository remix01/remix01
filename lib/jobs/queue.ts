/**
 * Job Queue — Async side effects via Upstash QStash
 * 
 * All escrow operations have side effects (emails, webhooks, auditing, etc).
 * This queue decouples them from the HTTP request so operations complete faster
 * and failures don't crash the main transaction.
 * 
 * QStash provides:
 * - HTTP-based, serverless job processing
 * - Automatic retries with exponential backoff
 * - Deduplication support
 * - Type-safe job definitions
 * - Observable status tracking
 * - Persistence across Vercel serverless restarts
 */

import { Client } from '@upstash/qstash'
import { assertQStashProductionEnv, env, hasQStash } from '../env'

// ── TYPES
export type JobType =
  | 'stripeCapture'
  | 'stripeRelease'
  | 'stripeCancel'
  | 'sendEmail'
  | 'auditLog'
  | 'webhook'
  | 'send_dispute_email'
  | 'send_refund_email'
  | 'send_release_email'
  | 'webhook_escrow_status_changed'
  | 'match_request'        // Orchestrator: run matching algorithm
  | 'notify_partners'      // Orchestrator: notify partners of matches
  | 'create_escrow'        // Orchestrator: create escrow payment
  | 'release_escrow'       // Orchestrator: release escrow to craftworker
  | 'cancel_escrow'        // Orchestrator: cancel/refund escrow
  | 'activate_guarantee'   // Orchestrator: activate SLA guarantee
  | 'task_started'         // Orchestrator: task timeline update
  | 'request_review'       // Orchestrator: request task review from customer
  | 'agent_schedule_propose'
  | 'agent_video_analyze'
  | 'stripe_refund_payment'
  | 'stripe_capture_payment'
  | 'stripe_release_payment'
  | 'send_payment_confirmed_email'
  | 'notify_dispute_resolved'

export interface Job<T = any> {
  data: T
}

export interface AgentScheduleProposePayload {
  job_id: string
  user_id: string
  obrtnik_id: string
  preferences: {
    raw: string
    days?: string[]
    time_range?: string
  }
  povprasevanje_id?: string
}

export interface AgentVideoAnalyzePayload {
  job_id: string
  user_id: string
  file_url: string
  file_type: 'image' | 'video_frame'
  description?: string
}

// ── QSTASH CLIENT
let qstash: Client | null = null

function getQStash(): Client | null {
  if (env.NODE_ENV === 'production') {
    assertQStashProductionEnv()
  }

  if (!hasQStash()) {
    return null
  }
  if (!qstash) {
    qstash = new Client({ token: env.QSTASH_TOKEN! })
  }
  return qstash
}

// ── ENQUEUE JOB
/**
 * Add a job to the queue via QStash. Returns job ID for tracking.
 * If QStash not configured, logs a warning and returns 'no-op'.
 */
export async function enqueue<T extends Record<string, any>>(
  jobType: JobType,
  payload: T,
  options?: {
    delay?: number
    retries?: number
  }
): Promise<string> {
  const client = getQStash()
  const baseUrl = env.NEXT_PUBLIC_APP_URL

  const correlationId =
    (payload as any)?.correlationId ??
    (payload as any)?.jobId ??
    (payload as any)?.job_id ??
    globalThis.crypto?.randomUUID?.() ??
    `job_${Date.now()}`
  const jobId = (payload as any)?.jobId ?? (payload as any)?.job_id ?? correlationId


  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new Error(`[Queue] QStash not configured in production — cannot enqueue job: ${jobType}`)
    }
    console.warn('[Queue] QStash not configured — job skipped', { jobType })
    if (env.NODE_ENV === 'development') {
      console.log('[Queue] In development: job would execute', {
        jobType,
        transactionId: (payload as any)?.transactionId ?? null,
        escrowId: (payload as any)?.escrowId ?? null,
        taskId: (payload as any)?.taskId ?? null,
        inquiryId: (payload as any)?.inquiryId ?? (payload as any)?.povprasevanjeId ?? null,
        jobId,
        correlationId,
      })
    }
    return 'no-op'
  }

  if (!baseUrl) {
    if (env.NODE_ENV === 'production') {
      throw new Error('[Queue] NEXT_PUBLIC_APP_URL not configured in production — cannot enqueue job')
    }
    console.warn(`[Queue] NEXT_PUBLIC_APP_URL not configured — job skipped`)
    return 'no-op'
  }

  const result = await client.publishJSON({
    url: `${baseUrl}/api/jobs/process`,
    body: {
      jobType,
      payload,
      metadata: { correlationId, jobId },
      enqueuedAt: Date.now(),
    },
    retries: options?.retries ?? 3,
    delay: options?.delay,
  })

  console.log('[JOB ENQUEUED]', {
    jobType,
    messageId: result.messageId,
    transactionId: (payload as any)?.transactionId ?? null,
    escrowId: (payload as any)?.escrowId ?? null,
    taskId: (payload as any)?.taskId ?? null,
    inquiryId: (payload as any)?.inquiryId ?? (payload as any)?.povprasevanjeId ?? null,
    jobId,
    correlationId,
  })
  return result.messageId
}

// ── CHECK JOB STATUS
/**
 * Get current status of a job by ID.
 * Note: QStash provides basic status through message IDs.
 */
export async function getJobStatus(jobId: string): Promise<Job | null> {
  // QStash doesn't provide direct job status queries
  // Job status is managed via our endpoint responses
  console.log(`[JOB STATUS] Checking status for ${jobId}`)
  return null
}

// ── GET QUEUE LENGTH
/**
 * QStash doesn't expose queue length directly.
 * This is a placeholder for compatibility.
 */
export async function getQueueLength(type: JobType): Promise<number> {
  console.warn(`[QUEUE LENGTH] QStash doesn't expose queue length directly`)
  return 0
}

// ── LIST DEAD LETTER QUEUE
/**
 * Get failed jobs from QStash.
 * QStash handles dead lettering automatically.
 */
export async function getDeadLetterJobs(limit = 100): Promise<Job[]> {
  console.log(`[DEAD LETTER] Querying failed jobs (limit: ${limit})`)
  return []
}

// ── STATS
/**
 * Get queue statistics for monitoring.
 * With QStash, monitoring is done via dashboard/API.
 */
export async function getQueueStats(): Promise<{
  [key in JobType]: number
} & { dead_letter: number }> {
  const stats: Partial<Record<JobType | 'dead_letter', number>> = {}
  const types: JobType[] = ['stripeCapture', 'stripeRelease', 'stripeCancel', 'sendEmail', 'auditLog', 'webhook']
  
  for (const type of types) {
    stats[type] = 0 // QStash doesn't expose per-type queue stats
  }
  
  stats.dead_letter = 0
  
  return stats as { [key in JobType]: number } & { dead_letter: number }
}

// ── CLEAR QUEUE (for testing)
export async function clearQueue(type: JobType): Promise<void> {
  console.warn(`[CLEAR QUEUE] QStash doesn't support manual queue clearing`)
}
