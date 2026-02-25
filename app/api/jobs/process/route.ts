/**
 * Background Job Processor API Route
 * 
 * This endpoint processes pending jobs from the queue.
 * In production, this should be called by:
 * - A scheduled cron task (e.g., every minute)
 * - A background worker service
 * - A Vercel Cron function
 * 
 * Security: This should be protected by an API key or auth check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processNextJob, processBatch } from '@/lib/jobs/processor'
import { JobType } from '@/lib/jobs/queue'

export const maxDuration = 60 // 60 second timeout for job processing

export async function POST(request: NextRequest) {
  try {
    // Security: Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.JOB_PROCESSOR_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, type, limit } = await request.json()

    // Process a single job type
    if (action === 'process-type' && type) {
      const job = await processNextJob(type as JobType)
      return NextResponse.json({
        success: true,
        jobProcessed: job?.id ?? null,
        status: job?.status,
      })
    }

    // Process batch across multiple types
    if (action === 'process-batch') {
      const types: JobType[] = [
        'send_release_email',
        'send_refund_email',
        'send_dispute_email',
        'send_payment_confirmed_email',
        'stripe_capture_payment',
        'stripe_refund_payment',
        'webhook_escrow_status_changed',
      ]

      const results = await processBatch(types, limit ?? 5)
      
      return NextResponse.json({
        success: true,
        processed: Object.fromEntries(results),
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "process-type" or "process-batch"' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[JOB PROCESSOR API]', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to process jobs' },
      { status: 500 }
    )
  }
}

// GET endpoint for stats
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.JOB_PROCESSOR_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { getQueueStats, getDeadLetterJobs } = await import('@/lib/jobs/queue')
    
    const stats = await getQueueStats()
    const deadLetterJobs = await getDeadLetterJobs(10)

    return NextResponse.json({
      stats,
      deadLetterCount: deadLetterJobs.length,
      deadLetterSample: deadLetterJobs.slice(0, 3),
    })

  } catch (error: any) {
    console.error('[JOB STATS API]', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to get stats' },
      { status: 500 }
    )
  }
}
