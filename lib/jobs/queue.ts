export interface Job {
  id: string
  type: 'stripeCapture' | 'stripeCancel' | 'sendEmail' | 'auditLog'
  data: Record<string, any>
  retries: number
  maxRetries: number
  createdAt: Date
  processedAt?: Date
  error?: string
}

// In-memory job queue with persistence to audit log
const jobQueue: Map<string, Job> = new Map()
let jobIdCounter = 0

/**
 * Enqueue a job for async processing
 * Jobs are executed after the DB transaction commits
 * @param jobType - Type of job to execute
 * @param payload - Job data
 * @param options - Retry and delay options
 */
export async function enqueue(
  jobType: Job['type'],
  payload: Record<string, any>,
  options?: { delay?: number; retries?: number }
) {
  const jobId = `job_${++jobIdCounter}_${Date.now()}`
  
  const job: Job = {
    id: jobId,
    type: jobType,
    data: payload,
    retries: 0,
    maxRetries: options?.retries ?? 3,
    createdAt: new Date(),
  }

  jobQueue.set(jobId, job)

  // Schedule job execution after optional delay
  const delayMs = options?.delay ?? 0
  setTimeout(() => {
    processJob(job).catch((err) => {
      console.error(`[JOBS] Unhandled error processing job ${jobId}:`, err)
    })
  }, delayMs)

  return jobId
}

/**
 * Process a single job with retry logic
 */
async function processJob(job: Job) {
  try {
    console.log(`[JOBS] Processing ${job.type} job: ${job.id}`)

    switch (job.type) {
      case 'stripeCapture': {
        const { handleStripeCapture } = await import('./workers/stripeCapture')
        await handleStripeCapture(job)
        break
      }
      case 'stripeCancel': {
        const { handleStripeCancel } = await import('./workers/stripeCancel')
        await handleStripeCancel(job)
        break
      }
      case 'sendEmail': {
        const { handleSendEmail } = await import('./workers/sendEmail')
        await handleSendEmail(job)
        break
      }
      case 'auditLog': {
        const { handleAuditLog } = await import('./workers/auditLogger')
        await handleAuditLog(job)
        break
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    job.processedAt = new Date()
    console.log(`[JOBS] Successfully processed ${job.type} job: ${job.id}`)
    jobQueue.delete(job.id)
  } catch (err) {
    job.retries++
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(
      `[JOBS] Job ${job.id} failed (attempt ${job.retries}/${job.maxRetries}): ${errorMsg}`
    )

    if (job.retries < job.maxRetries) {
      // Retry with exponential backoff: 5s, 15s, 45s
      const delayMs = 5000 * Math.pow(3, job.retries - 1)
      console.log(`[JOBS] Retrying job ${job.id} in ${delayMs}ms`)
      
      setTimeout(() => {
        processJob(job).catch((err) => {
          console.error(`[JOBS] Unhandled error retrying job ${job.id}:`, err)
        })
      }, delayMs)
    } else {
      // Max retries exceeded - log as failed
      job.error = errorMsg
      console.error(
        `[JOBS] Job ${job.id} failed after ${job.maxRetries} attempts. Manual intervention required.`
      )
      // TODO: Alert admin of failed job (e.g., via email or Sentry)
    }
  }
}

/**
 * Get job status (for debugging/monitoring)
 */
export function getJobStatus(jobId: string): Job | undefined {
  return jobQueue.get(jobId)
}

/**
 * Get all pending/failed jobs (for monitoring)
 */
export function getPendingJobs(): Job[] {
  return Array.from(jobQueue.values())
}
