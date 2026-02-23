import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

const querySchema = z.object({
  filter: z.enum(['all', 'active', 'suspended', 'unverified']).default('all'),
})

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role')
      .eq('email', user.email!)
      .single()

    if (userError || dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    return NextResponse.json(craftworkersWithViolations)
  } catch (error) {
    console.error('[API] Failed to fetch craftworkers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
