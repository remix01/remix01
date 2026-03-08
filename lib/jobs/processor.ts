/**
 * Job Processor — Routes jobs to their respective workers
 * 
 * This file coordinates the processing of different job types.
 * Jobs are received via QStash webhook calls to /api/jobs/process
 */

import { Job, JobType } from './queue'
import { handleStripeCapture } from './workers/stripeCapture'
import { handleStripeRelease } from './workers/stripeRelease'
import { handleStripeCancel } from './workers/stripeCancel'
import { handleSendEmail } from './workers/sendEmail'
import { handleAuditLog } from './workers/auditLogger'
import { handleWebhook } from './workers/webhookWorker'

/**
 * Route a job to its processor function
 */
export async function processJob(jobType: JobType, job: Job): Promise<void> {
  switch (jobType) {
    case 'stripeCapture':
      return handleStripeCapture(job)
    case 'stripeRelease':
      return handleStripeRelease(job)
    case 'stripeCancel':
      return handleStripeCancel(job)
    case 'sendEmail':
      return handleSendEmail(job)
    case 'auditLog':
      return handleAuditLog(job)
    case 'webhook':
      return handleWebhook(job)
    default:
      const _exhaustive: never = jobType
      throw new Error(`Unknown job type: ${_exhaustive}`)
  }
}
