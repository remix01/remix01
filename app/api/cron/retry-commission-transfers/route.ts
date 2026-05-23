import { NextResponse } from 'next/server'
import { commissionService } from '@/lib/services/commissionService'
import { withCronGuard, cronWindow } from '@/lib/cron/cronGuard'

/**
 * Cron Job: Retry failed commission transfers
 *
 * Retries failed Stripe transfers, up to 3 attempts per commission log.
 * Protected by CRON_SECRET + overlap lock + hour-window via withCronGuard.
 * The hour-window prevents double-retrying the same transfers if Vercel retries.
 */
export const GET = withCronGuard(
  {
    jobName: 'retry-commission-transfers',
    lockTtlSeconds: 600,
    windowKey: cronWindow.hour,
    windowTtlSeconds: 3540,
  },
  async (_req) => {
    const result = await commissionService.retryFailedTransfers()
    console.log(JSON.stringify({
      level: 'info',
      job: 'retry-commission-transfers',
      event: 'done',
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
    }))
    return NextResponse.json({ success: true, ...result })
  },
)
