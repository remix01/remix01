import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migratePartnerToNewSystem } from '@/lib/migration/partner-migration'
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

    const { partnerId } = await req.json()

    if (!partnerId) {
      return fail('Partner ID is required', 400)
    }

    const result = await migratePartnerToNewSystem(partnerId)

    if (result.success) {
      return ok({
        success: true,
        newProfileId: result.newProfileId
      })
    } else {
      return fail(result.error ?? 'Migration failed', 400)
    }
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return fail('Internal server error', 500)
  }
}
