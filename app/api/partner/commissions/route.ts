import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { commissionService } from '@/lib/services/commissionService'
import { ok, fail } from '@/lib/http/response'

const querySchema = z.object({
  months: z.coerce.number().optional().default(3),
})

/**
 * GET /api/partner/commissions
 * 
 * Get authenticated partner's commission history and summary
 * 
 * Query params:
 * - months: number of months to include (default: 3)
 * 
 * Returns:
 * - total_jobs: number of completed jobs
 * - total_gross_eur: total job amounts
 * - total_commission_eur: total commissions earned
 * - total_payout_eur: total paid out to partner
 * - transferred_count: jobs successfully transferred
 * - pending_count: jobs pending transfer
 * - failed_count: transfers that failed
 * - logs: detailed transaction logs
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const validation = querySchema.safeParse({
      months: searchParams.get('months'),
    })

    if (!validation.success) {
      return fail('Invalid query parameters', 400, { details: validation.error.errors })
    }

    const { months } = validation.data

    // Get commission summary for authenticated partner
    const summary = await commissionService.getPartnerCommissions(user.id, months)

    return ok({
      success: true,
      data: summary,
      period_months: months,
    })

  } catch (error) {
    console.error('[GET /api/partner/commissions]:', error)
    return fail('Failed to fetch commissions', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
