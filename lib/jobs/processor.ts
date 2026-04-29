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
import { handleEmailJob } from './workers/emailWorker'
import { handleAuditLog } from './workers/auditLogger'
import { handleWebhook } from './workers/webhookWorker'
import { handleMatchRequest } from './workers/taskProcessor'
import { handleNotifyPartners } from './workers/taskProcessor'
import { handleCreateEscrow } from './workers/taskProcessor'
import { handleReleaseEscrow } from './workers/taskProcessor'
import { handleCancelEscrow } from './workers/taskProcessor'
import { handleActivateGuarantee } from './workers/taskProcessor'
import { handleTaskStarted } from './workers/taskProcessor'
import { handleRequestReview } from './workers/taskProcessor'
import { handleAgentSchedulePropose } from './workers/agentSchedulePropose'
import { handleAgentVideoAnalyze } from './workers/agentVideoAnalyze'
import { handleStripeJob } from './workers/stripeWorker'

type JobHandler = (job: Job) => Promise<void>

const notImplementedHandler = (jobType: JobType): JobHandler => {
  return async () => {
    throw new Error(`[JOBS] Handler not implemented for active job type: ${jobType}`)
  }
}

const jobHandlers: Record<JobType, JobHandler> = {
  stripeCapture: handleStripeCapture,
  stripeRelease: handleStripeRelease,
  stripeCancel: handleStripeCancel,
  sendEmail: (job) => handleEmailJob({ ...job, type: 'sendEmail' }),
  auditLog: handleAuditLog,
  webhook: handleWebhook,
  send_dispute_email: (job) => handleEmailJob({ ...job, type: 'send_dispute_email' }),
  send_refund_email: (job) => handleEmailJob({ ...job, type: 'send_refund_email' }),
  send_release_email: (job) => handleEmailJob({ ...job, type: 'send_release_email' }),
  webhook_escrow_status_changed: handleWebhook,
  match_request: handleMatchRequest,
  notify_partners: handleNotifyPartners,
  create_escrow: handleCreateEscrow,
  release_escrow: handleReleaseEscrow,
  cancel_escrow: handleCancelEscrow,
  activate_guarantee: handleActivateGuarantee,
  task_started: handleTaskStarted,
  request_review: handleRequestReview,
  agent_schedule_propose: handleAgentSchedulePropose,
  agent_video_analyze: handleAgentVideoAnalyze,
  stripe_refund_payment: (job) => handleStripeJob({ ...job, type: 'stripe_refund_payment' }),
  stripe_capture_payment: (job) => handleStripeJob({ ...job, type: 'stripe_capture_payment' }),
  stripe_release_payment: notImplementedHandler('stripe_release_payment'),
  send_payment_confirmed_email: (job) => handleEmailJob({ ...job, type: 'send_payment_confirmed_email' }),
  notify_dispute_resolved: notImplementedHandler('notify_dispute_resolved'),
}

/**
 * Route a job to its processor function
 */
export async function processJob(jobType: JobType, job: Job): Promise<void> {
  const handler = jobHandlers[jobType]
  return handler(job)
}
