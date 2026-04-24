import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { commissionService } from '@/lib/services/commissionService'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

const querySchema = z.object({
  months: z.coerce.number().optional().default(3),
})

/**
 * GET /api/admin/revenue
 * 
 * Get platform revenue summary from commissions
 * ADMIN ONLY - checks user is in admin role
 * 
 * Query params:
 * - months: number of months to include (default: 3)
 * 
 * Returns:
 * - total_commission_eur: all commissions earned
 * - earned_commission_eur: commissions from completed/transferred jobs
 * - transferred_commission_eur: commissions already transferred
 * - pending_commission_eur: commissions awaiting transfer
 * - jobs_completed: total jobs completed
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // Check admin role
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Forbidden - admin access required', 403)
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

    // Get platform revenue
    const revenue = await commissionService.getPlatformRevenue(months)

    return ok({
      success: true,
      data: revenue,
      period_months: months,
    })

  } catch (error) {
    console.error('[GET /api/admin/revenue]:', error)
    return fail('Failed to fetch revenue data', 500)
  }
}
