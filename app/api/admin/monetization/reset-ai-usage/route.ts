import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return fail('Missing userId', 400)
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

    return ok({
      success: true,
      message: 'AI usage reset successfully',
    })
  } catch (error) {
    console.error('[v0] Reset AI usage error:', error)
    return fail(error instanceof Error ? error.message : 'Internal server error', 500)
  }
}
