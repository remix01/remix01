import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, tier } = await request.json()

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'Missing userId or tier' },
        { status: 400 }
      )
    }

    // Validate tier
    const validTiers = ['start', 'pro', 'elite', 'enterprise']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
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
    await supabase
      .from('admin_audit_log')
      .insert({
        action: 'upgrade_user',
        admin_id: 'system', // Would be from auth context in real app
        user_id: userId,
        old_value: { action: 'manual_upgrade' },
        new_value: { tier },
        created_at: new Date().toISOString(),
      })
      .catch(err => console.error('Audit log error:', err))

    return NextResponse.json({
      success: true,
      message: `User upgraded to ${tier} tier`,
    })
  } catch (error) {
    console.error('[v0] Upgrade user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
