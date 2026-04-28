import { ok, fail } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import {
  partnerCRMService,
  PartnerCRMServiceError,
} from '@/lib/partner/crm/service'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    const data = await partnerCRMService.getCRMData(supabase, user.id)
    return ok(data)
  } catch (error) {
    if (error instanceof PartnerCRMServiceError) {
      return fail(error.code, error.message, error.status)
    }

    console.error('[GET /api/partner/crm] unexpected error:', error)
    return fail('INTERNAL_ERROR', 'Prišlo je do nepričakovane napake.', 500)
  }
}
