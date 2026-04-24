import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { craftworkerUnsuspensionEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/sender'
import { ok, fail } from '@/lib/http/response'

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
      return fail('Unauthorized', 401)
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Forbidden - Admin only', 403)
    }

    const { id: craftworkerId } = await params

    // Get craftworker profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*, user:user_id(*)')
      .eq('user_id', craftworkerId)
      .single()

    if (profileError || !profile) {
      return fail('Craftworker not found', 404)
    }

    if (!profile.is_suspended) {
      return fail('Craftworker is not suspended', 400)
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

    return ok({
      success: true,
      message: 'Craftworker unsuspended successfully',
      craftworkerId,
      unsuspendedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[unsuspend] Error:', error)
    
    return fail('Internal server error', 500)
  }
}
