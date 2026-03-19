import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { commissionService } from '@/lib/services/commissionService'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const validation = querySchema.safeParse({
      months: searchParams.get('months'),
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { months } = validation.data

    // Get platform revenue
    const revenue = await commissionService.getPlatformRevenue(months)

    return NextResponse.json({
      success: true,
      data: revenue,
      period_months: months,
    })

  } catch (error) {
    console.error('[GET /api/admin/revenue]:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch revenue data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
