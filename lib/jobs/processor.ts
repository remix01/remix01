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
    case 'match_request':
      return handleMatchRequest(job)
    case 'notify_partners':
      return handleNotifyPartners(job)
    case 'create_escrow':
      return handleCreateEscrow(job)
    case 'release_escrow':
      return handleReleaseEscrow(job)
    case 'cancel_escrow':
      return handleCancelEscrow(job)
    case 'activate_guarantee':
      return handleActivateGuarantee(job)
    case 'task_started':
      return handleTaskStarted(job)
    case 'request_review':
      return handleRequestReview(job)
    case 'agent_schedule_propose':
      return handleAgentSchedulePropose(job)
    case 'agent_video_analyze':
      return handleAgentVideoAnalyze(job)
    default:
      const _exhaustive: string = jobType
      throw new Error(`Unknown job type: ${_exhaustive}`)
  }
}

