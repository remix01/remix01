import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

const querySchema = z.object({
  type: z.enum(['PHONE_DETECTED', 'EMAIL_DETECTED', 'BYPASS_ATTEMPT', 'SUSPICIOUS_PATTERN']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  reviewed: z.enum(['true', 'false']).optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
})

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = querySchema.parse(searchParams)
    
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Build filters
    let query = supabaseAdmin
      .from('violation')
      .select(`
        *,
        job:job_id(id, title, category, status),
        user:user_id(id, name, email, craftworker_profile:craftworker_profile(bypass_warnings, is_suspended)),
        message:message_id(id, created_at)
      `, { count: 'exact' })

    if (params.type) query = query.eq('type', params.type)
    if (params.severity) query = query.eq('severity', params.severity)
    if (params.reviewed) query = query.eq('is_reviewed', params.reviewed === 'true')

    const { data: violations, count: total, error } = await query
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      violations,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    })

  } catch (error) {
    console.error('[admin/violations] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
