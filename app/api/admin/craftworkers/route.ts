import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'
import { ok, fail } from '@/lib/http/response'

const querySchema = z.object({
  filter: z.enum(['all', 'active', 'suspended', 'unverified']).default('all'),
})

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return fail('Unauthorized', 401)
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Forbidden', 403)
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const { filter } = querySchema.parse({
      filter: searchParams.get('filter') || 'all'
    })

    // Build filters
    let query = supabaseAdmin
      .from('craftworker_profile')
      .select(`
        *,
        user:user_id(id, name, email)
      `)

    if (filter === 'active') {
      query = query.eq('is_suspended', false).eq('is_verified', true)
    } else if (filter === 'suspended') {
      query = query.eq('is_suspended', true)
    } else if (filter === 'unverified') {
      query = query.eq('is_verified', false)
    }

    const { data: craftworkers, error } = await query
      .order('is_suspended', { ascending: true })
      .order('bypass_warnings', { ascending: false })
      .order('total_jobs_completed', { ascending: false })

    if (error) throw new Error(error.message)

    // Get violation counts for each craftworker
    const craftworkersWithViolations = await Promise.all(
      (craftworkers || []).map(async (cw: any) => {
        const { count: violationCount } = await supabaseAdmin
          .from('violation')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', cw.user.id)

        return {
          id: cw.user.id,
          name: cw.user.name,
          email: cw.user.email,
          packageType: cw.package_type,
          stripeOnboardingComplete: cw.stripe_onboarding_complete,
          totalJobsCompleted: cw.total_jobs_completed,
          avgRating: Number(cw.avg_rating),
          bypassWarnings: cw.bypass_warnings,
          isSuspended: cw.is_suspended,
          isVerified: cw.is_verified,
          violationCount: violationCount || 0,
        }
      })
    )

    return Response.json(craftworkersWithViolations)
  } catch (error) {
    console.error('[API] Failed to fetch craftworkers:', error)
    return fail('Internal server error', 500)
  }
}
