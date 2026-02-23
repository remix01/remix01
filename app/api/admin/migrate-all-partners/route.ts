import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migrateAllPartners } from '@/lib/migration/partner-migration'

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

    // Get batch size from query or env
    const batchSize = process.env.MIGRATION_BATCH_SIZE 
      ? parseInt(process.env.MIGRATION_BATCH_SIZE, 10)
      : 50

    const result = await migrateAllPartners(batchSize)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[v0] Batch migration error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
