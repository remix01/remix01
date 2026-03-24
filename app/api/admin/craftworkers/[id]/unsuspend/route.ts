import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { craftworkerUnsuspensionEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'

/**
 * POST /api/admin/craftworkers/[id]/unsuspend
 * Unsuspend a craftworker account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id: craftworkerId } = await params

    // Get craftworker profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*, user:user_id(*)')
      .eq('user_id', craftworkerId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Craftworker not found' }, { status: 404 })
    }

    if (!profile.is_suspended) {
      return NextResponse.json({ error: 'Craftworker is not suspended' }, { status: 400 })
    }

    // Unsuspend the craftworker
    const { error: updateError } = await supabaseAdmin
      .from('craftworker_profile')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_reason: null
      })
      .eq('user_id', craftworkerId)

    if (updateError) throw new Error(updateError.message)

    console.log(`[unsuspend] Craftworker ${craftworkerId} unsuspended by admin ${admin.id}`)

    // Send unsuspension email
    const emailTemplate = craftworkerUnsuspensionEmail(profile.user.name)
    await sendEmail(profile.user.email, emailTemplate)
    
    console.log(`[unsuspend] Unsuspension email sent to ${profile.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Craftworker unsuspended successfully',
      craftworkerId,
      unsuspendedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[unsuspend] Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
