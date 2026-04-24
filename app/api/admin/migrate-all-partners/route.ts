import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migrateAllPartners } from '@/lib/migration/partner-migration'
import { ok, fail } from '@/lib/http/response'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return fail('Unauthorized', 401)
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .single()

    if (!adminUser) {
      return fail('Forbidden', 403)
    }

    // Get batch size from query or env
    const batchSize = process.env.MIGRATION_BATCH_SIZE 
      ? parseInt(process.env.MIGRATION_BATCH_SIZE, 10)
      : 50

    const result = await migrateAllPartners(batchSize)

    return ok({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[v0] Batch migration error:', error)
    return fail(error instanceof Error ? error.message : 'Internal server error', 500)
  }
}
