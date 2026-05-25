/**
 * Cron — Supply/Demand Balance Check
 *
 * Runs every 6 hours.
 * Calculates supply/demand signals per city and triggers corrective actions:
 *  - Too many open tasks, few craftsmen → trigger extra discovery
 *  - Too many craftsmen, few tasks → log signal for marketing
 *  - Draft expiry nudges
 *
 * Schedule: "0 every-6h * * *" (vercel.json)
 */

import { NextResponse } from 'next/server'
import { withCronGuard } from '@/lib/cron/cronGuard'
import { enqueue } from '@/lib/jobs/queue'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 120

export const GET = withCronGuard(
  {
    jobName:        'supply-demand-balance',
    lockTtlSeconds: 120,
  },
  async (_req) => {
    const start = Date.now()
    const supabase = createAdminClient()

    const { data: countries } = await supabase
      .from('countries')
      .select('code')
      .eq('is_active', true)

    const enqueued: string[] = []

    for (const country of countries ?? []) {
      await enqueue('supply_demand_rebalance', { countryCode: country.code }, { retries: 2 })
      enqueued.push(country.code)
    }

    // Nudge visitors with expiring drafts
    await enqueue('draft_expiry_followup', {}, { retries: 1 })

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - start,
      enqueued,
      ranAt: new Date().toISOString(),
    })
  },
)
