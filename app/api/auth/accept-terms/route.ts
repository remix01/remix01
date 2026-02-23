import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CURRENT_TOS_VERSION = '2026-02-v1'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tosVersion, craftworkerAgreement } = body

    // Validate version
    if (tosVersion !== CURRENT_TOS_VERSION) {
      return NextResponse.json(
        { error: 'Invalid ToS version' },
        { status: 400 }
      )
    }

    // Update user in database
    const updateData: any = {
      tos_accepted_at: new Date().toISOString(),
      tos_version: CURRENT_TOS_VERSION,
    }

    if (craftworkerAgreement) {
      updateData.craftworker_agreement_accepted_at = new Date().toISOString()
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user')
      .update(updateData)
      .eq('id', user.id)
      .select('id, tos_accepted_at, tos_version, craftworker_agreement_accepted_at')
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        tosAcceptedAt: updatedUser?.tos_accepted_at,
        tosVersion: updatedUser?.tos_version,
        craftworkerAgreementAcceptedAt: updatedUser?.craftworker_agreement_accepted_at,
      },
    })
  } catch (error) {
    console.error('[accept-terms] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
