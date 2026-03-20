import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, flagged } = await request.json()

    if (!userId || typeof flagged !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing userId or flagged status' },
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
    await supabase
      .from('admin_audit_log')
      .insert({
        action: flagged ? 'flag_user' : 'unflag_user',
        admin_id: 'system',
        user_id: userId,
        old_value: { flagged: !flagged },
        new_value: { flagged },
        created_at: new Date().toISOString(),
      })
      .catch(err => console.error('Audit log error:', err))

    return NextResponse.json({
      success: true,
      message: `User ${flagged ? 'flagged' : 'unflagged'} successfully`,
    })
  } catch (error) {
    console.error('[v0] Flag user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
