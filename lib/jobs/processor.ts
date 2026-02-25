/**
 * Job Processor — Routes jobs to their respective workers
 * 
 * This file coordinates the processing of different job types.
 * In production, this would be called by a background worker service.
 */

import { Job, JobType, dequeueAndProcess } from './queue'
import { handleEmailJob } from './workers/emailWorker'
import { handleStripeJob } from './workers/stripeWorker'
import { handleWebhookJob } from './workers/webhookWorker'

/**
 * Process a single job of the given type.
 * Returns the processed job or null if queue was empty.
 */
export async function processNextJob(type: JobType): Promise<Job | null> {
  const processor = getProcessor(type)
  return dequeueAndProcess(type, processor)
}

/**
 * Get the processor function for a job type
 */
function getProcessor(type: JobType) {
  switch (type) {
    case 'send_release_email':
    case 'send_refund_email':
    case 'send_dispute_email':
    case 'send_payment_confirmed_email':
      return handleEmailJob

    case 'stripe_capture_payment':
    case 'stripe_refund_payment':
      return handleStripeJob

    case 'webhook_escrow_status_changed':
      return handleWebhookJob

    case 'notify_dispute_resolved':
      // Could be email, webhook, or SMS
      return handleEmailJob

    case 'audit_log_created':
      // Audit logs are fire-and-forget
      return async (job: Job) => {
        console.log(`[AUDIT] Logged to DLQ for analysis`, job.payload)
      }

    default:
      throw new Error(`Unknown job type: ${type}`)
  }
}

/**
 * Process all pending jobs for a given type.
 * Returns count of jobs processed.
 * 
 * Usage in a scheduled task:
 * ```ts
 * const count = await processAllJobsOfType('send_release_email')
 * console.log(`Processed ${count} email jobs`)
 * ```
 */
export async function processAllJobsOfType(type: JobType): Promise<number> {
  let count = 0
  let job

  do {
    try {
      job = await processNextJob(type)
      if (job) count++
    } catch (err) {
      console.error(`[JOB PROCESSOR] Error in job loop:`, err)
      // Continue processing other jobs
      break
    }
  } while (job)

  return count
}

/**
 * Process jobs from multiple types in sequence
 */
export async function processBatch(
  types: JobType[],
  limit = 10
): Promise<Map<JobType, number>> {
  const results = new Map<JobType, number>()

  for (const type of types) {
    let count = 0
    let job

    do {
      try {
        job = await processNextJob(type)
        if (job) {
          count++
          if (count >= limit) break
        }
      } catch (err) {
        console.error(`[JOB PROCESSOR] Error processing ${type}:`, err)
        break
      }
    } while (job)

    if (count > 0) {
      results.set(type, count)
    }
  }

  return results
}
