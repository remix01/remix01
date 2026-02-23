import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migratePartnerToNewSystem } from '@/lib/migration/partner-migration'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { partnerId } = await req.json()

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    const result = await migratePartnerToNewSystem(partnerId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        newProfileId: result.newProfileId
      })
    } else {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
