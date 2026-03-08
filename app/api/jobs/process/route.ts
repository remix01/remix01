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

export const maxDuration = 60 // 60 second timeout for job processing

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobType, payload } = body

    if (!jobType || !payload) {
      return NextResponse.json(
        { error: 'Missing jobType or payload' },
        { status: 400 }
      )
    }

    console.log(`[API] Processing job: ${jobType}`, { payload })

    // Process the job
    await processJob(jobType as JobType, { data: payload })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[JOBS API]', error)
    // Return 5xx so QStash retries. Return 2xx and job is considered handled.
    return NextResponse.json(
      { error: error.message ?? 'Failed to process job' },
      { status: 500 }
    )
  }
}

export const POST = verifySignatureAppRouter(handler)
