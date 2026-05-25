import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = userProfile?.role === 'admin'

    // Build query
    let query = supabaseAdmin
      .from('escrow_disputes')
      .select(
        `
        id,
        hold_id,
        opened_by,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        resolution,
        admin_notes,
        opened_by_profile:profiles!escrow_disputes_opened_by_fkey(id, full_name, email)
      `
      )
      .order('created_at', { ascending: false })

    // If not admin, only show user's own disputes
    if (!isAdmin) {
      query = query.eq('opened_by', user.id)
    }

    const { data: disputes, error: queryError } = await query

    if (queryError) {
      console.error('[DISPUTES API] Query error:', queryError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch disputes' },
        { status: 500 }
      )
    }

    const result = (disputes || []).map((dispute) => ({
      id: dispute.id,
      escrowId: dispute.hold_id,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      createdAt: dispute.created_at,
      resolvedAt: dispute.resolved_at,
      resolution: dispute.resolution,
      adminNotes: dispute.admin_notes,
      openedBy: dispute.opened_by_profile,
      daysOpen: Math.floor(
        (Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[DISPUTES API]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
