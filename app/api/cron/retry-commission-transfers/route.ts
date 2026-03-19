import { NextRequest, NextResponse } from 'next/server'
import { commissionService } from '@/lib/services/commissionService'

/**
 * Cron Job: Retry failed commission transfers
 * 
 * Runs periodically (e.g., every 30 minutes) to retry failed Stripe transfers.
 * Limits retry attempts to 3 per commission log.
 * 
 * Triggered by: Vercel Cron Schedules or external scheduler
 * Auth: Vercel's X-Vercel-Cron header
 */
export async function GET(request: NextRequest) {
  // Verify this is a real cron request from Vercel
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('[retry-commission-transfers] Starting retry job')

    const result = await commissionService.retryFailedTransfers()

    console.log(
      `[retry-commission-transfers] Retry completed: ` +
      `${result.retried} retried, ${result.succeeded} succeeded, ${result.failed} failed`
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Commission transfer retry job completed',
        ...result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[retry-commission-transfers] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
