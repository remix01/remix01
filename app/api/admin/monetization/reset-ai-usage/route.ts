import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(['super_admin'])
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing userId' },
          legacy_error: 'Missing userId',
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Reset AI usage counters
    const { error: resetError } = await supabase
      .from('profiles')
      .update({
        ai_messages_used_today: 0,
        ai_messages_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (resetError) throw resetError

    // Log the action
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        action: 'reset_ai_usage',
        admin_id: 'system',
        user_id: userId,
        old_value: { action: 'reset' },
        new_value: { ai_messages_used_today: 0 },
        created_at: new Date().toISOString(),
      })
    if (auditError) console.error('Audit log error:', auditError)

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'AI usage reset successfully',
    })
  } catch (error) {
    console.error('[v0] Reset AI usage error:', error)
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
