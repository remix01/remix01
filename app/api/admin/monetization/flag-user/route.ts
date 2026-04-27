import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(['super_admin'])
    const { userId, flagged } = await request.json()

    if (!userId || typeof flagged !== 'boolean') {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing userId or flagged status' },
          legacy_error: 'Missing userId or flagged status',
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update flag status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        flagged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    // Log the action
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        action: flagged ? 'flag_user' : 'unflag_user',
        admin_id: 'system',
        user_id: userId,
        old_value: { flagged: !flagged },
        new_value: { flagged },
        created_at: new Date().toISOString(),
      })
    if (auditError) console.error('Audit log error:', auditError)

    return NextResponse.json({
      ok: true,
      success: true,
      message: `User ${flagged ? 'flagged' : 'unflagged'} successfully`,
    })
  } catch (error) {
    console.error('[v0] Flag user error:', error)
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
