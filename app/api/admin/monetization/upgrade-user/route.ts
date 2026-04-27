import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(['super_admin'])
    const { userId, tier } = await request.json()

    if (!userId || !tier) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing userId or tier' },
          legacy_error: 'Missing userId or tier',
        },
        { status: 400 }
      )
    }

    // Validate tier
    const validTiers = ['start', 'pro', 'elite', 'enterprise']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid tier' },
          legacy_error: 'Invalid tier',
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update user subscription tier
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    // Log the action for audit trail
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        action: 'upgrade_user',
        admin_id: 'system', // Would be from auth context in real app
        user_id: userId,
        old_value: { action: 'manual_upgrade' },
        new_value: { tier },
        created_at: new Date().toISOString(),
      })
    if (auditError) console.error('Audit log error:', auditError)

    return NextResponse.json({
      ok: true,
      success: true,
      message: `User upgraded to ${tier} tier`,
    })
  } catch (error) {
    console.error('[v0] Upgrade user error:', error)
    const authFailure = toAdminAuthFailure(error)
    if (authFailure.code === 'UNAUTHORIZED' || authFailure.code === 'FORBIDDEN') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: authFailure.code,
            message: authFailure.message,
          },
          legacy_error: authFailure.message,
        },
        { status: authFailure.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message },
        legacy_error: message,
      },
      { status: 500 }
    )
  }
}
