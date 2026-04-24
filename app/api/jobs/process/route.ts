import { getErrorMessage } from '@/lib/utils/error'
/**
 * Job Processor API Route
 * 
 * This endpoint receives job notifications from Upstash QStash.
 * QStash calls this URL for every job with automatic retries and exponential backoff.
 * 
 * Security: This endpoint is protected by QStash signature verification.
 */

import { NextRequest } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { processJob } from '@/lib/jobs/processor'
import { JobType } from '@/lib/jobs/queue'
import { ok, fail } from '@/lib/http/response'

export const maxDuration = 60 // 60 second timeout for job processing

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobType, payload } = body

    if (!jobType || !payload) {
      return fail('Missing jobType or payload', 400)
    }

    console.log(`[API] Processing job: ${jobType}`, { payload })

    // Process the job
    await processJob(jobType as JobType, { data: payload })

    return ok({ success: true })

  } catch (error: unknown) {
    console.error('[JOBS API]', error)
    // Return 5xx so QStash retries. Return 2xx and job is considered handled.
    return fail(getErrorMessage(error) ?? 'Failed to process job', 500)
  }
}

export const POST = verifySignatureAppRouter(handler)
