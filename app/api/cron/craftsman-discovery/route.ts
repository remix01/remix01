/**
 * Cron — Craftsman Discovery
 *
 * Runs daily at 03:00 UTC.
 * Discovers new craftsmen via Google Maps for all active countries/cities.
 * After discovery, enqueues invite batch job for found prospects.
 *
 * Schedule: "0 3 * * *" (vercel.json)
 */

import { NextResponse } from 'next/server'
import { withCronGuard, cronWindow } from '@/lib/cron/cronGuard'
import { runCountryDiscovery } from '@/lib/agents/onboarding/craftsman-discovery-agent'
import { enqueue } from '@/lib/jobs/queue'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 300  // discovery can take up to 5 minutes

export const GET = withCronGuard(
  {
    jobName:         'craftsman-discovery',
    lockTtlSeconds:  300,
    windowKey:       cronWindow.day,
    windowTtlSeconds: 20 * 60 * 60,  // 20h window — once per day
  },
  async (_req) => {
    const start = Date.now()
    const supabase = createAdminClient()

    // Get all active countries
    const { data: countries } = await supabase
      .from('countries')
      .select('code')
      .eq('is_active', true)

    if (!countries?.length) {
      return NextResponse.json({ ok: true, message: 'No active countries', durationMs: Date.now() - start })
    }

    const results: Array<{ country: string; cities: number; found: number; inserted: number }> = []

    for (const country of countries) {
      const cityResults = await runCountryDiscovery(country.code, 5)
      const totals = cityResults.reduce(
        (acc, r) => ({ found: acc.found + r.found, inserted: acc.inserted + r.inserted }),
        { found: 0, inserted: 0 },
      )
      results.push({ country: country.code, cities: cityResults.length, ...totals })

      // Enqueue invite batch after discovery
      if (totals.inserted > 0) {
        await enqueue('craftsman_invite_batch', {
          countryCode: country.code,
          limit:       totals.inserted,
        }, { delay: 60, retries: 2 })  // 60s delay to let DB settle
      }
    }

    // Also trigger supply/demand rebalance for SI
    await enqueue('supply_demand_rebalance', { countryCode: 'SI' }, { delay: 120 })

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - start,
      results,
      ranAt: new Date().toISOString(),
    })
  },
)
