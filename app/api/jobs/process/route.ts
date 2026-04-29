/**
 * Job Processor API Route
 * 
 * This endpoint receives job notifications from Upstash QStash.
 * QStash calls this URL for every job with automatic retries and exponential backoff.
 * 
 * Security: This endpoint is protected by QStash signature verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { processJob } from '@/lib/jobs/processor'
import { JobType } from '@/lib/jobs/queue'
import { assertQStashProductionEnv, env } from '@/lib/env'

export const maxDuration = 60 // 60 second timeout for job processing

function parseRetryCount(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function isPermanentJobError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('Unknown job type') || error.message.includes('Handler not implemented')
}

function handleJobFailureAlert(context: {
  jobType: string
  jobId: string | null
  correlationId: string | null
  retryCount: number
  maxRetries: number
  permanent: boolean
  errorMessage: string
}) {
  console.error('[JOBS API][ALERT] Job failure candidate for DLQ/manual intervention', context)
}

async function handler(req: NextRequest) {
  const retryCount = parseRetryCount(req.headers.get('upstash-retries'))
  const maxRetries = parseRetryCount(req.headers.get('upstash-max-retries'))
  let currentJobType = 'unknown'
  let currentCorrelationId: string | null = null
  let currentJobId: string | null = null

  try {
    if (env.NODE_ENV === 'production') {
      assertQStashProductionEnv()
    }
    const body = await req.json()
    const { jobType, payload, metadata } = body

    if (!jobType || !payload) {
      return NextResponse.json(
        { error: 'Missing jobType or payload' },
        { status: 400 }
      )
    }

    const correlationId = metadata?.correlationId ?? payload?.correlationId ?? null
    const jobId = metadata?.jobId ?? payload?.jobId ?? payload?.job_id ?? null
    currentJobType = jobType
    currentCorrelationId = correlationId
    currentJobId = jobId

    console.log('[API] Processing job', {
      status: 'started',
      jobType,
      correlationId,
      jobId,
      transactionId: payload?.transactionId ?? null,
      escrowId: payload?.escrowId ?? null,
      taskId: payload?.taskId ?? null,
      inquiryId: payload?.inquiryId ?? payload?.povprasevanjeId ?? null,
      retryCount,
      maxRetries,
    })

    // Process the job
    await processJob(jobType as JobType, { data: payload })

    console.log('[API] Processing job', {
      status: 'success',
      jobType,
      correlationId,
      jobId,
      retryCount,
      maxRetries,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const permanent = isPermanentJobError(error)
    const shouldAlert = permanent || (maxRetries > 0 && retryCount >= maxRetries)

    console.error('[JOBS API] Processing failed', {
      status: 'failure',
      name: error instanceof Error ? error.name : 'UnknownError',
      message: errorMessage,
      retryCount,
      maxRetries,
      permanent,
    })

    if (shouldAlert) {
      handleJobFailureAlert({
        jobType: currentJobType,
        jobId: currentJobId,
        correlationId: currentCorrelationId,
        retryCount,
        maxRetries,
        permanent,
        errorMessage,
      })
    }

    // Return 5xx so QStash retries. Return 2xx and job is considered handled.
    return NextResponse.json(
      { error: 'Failed to process job' },
      { status: 500 }
    )
  }
}

export const POST = verifySignatureAppRouter(handler)
