import { getPartner } from '@/lib/supabase-partner'
import { partnerService, handleServiceError } from '@/lib/services'
import { ok, fail } from '@/lib/http/response'

/**
 * GET — partner's assigned inquiries with filters
 */
export async function GET(req: Request) {
  const partner = await getPartner()
  if (!partner) return fail('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 10

  try {
    // Delegate to service layer
    const result = await partnerService.getPartnerInquiries(partner.id, {
      status,
      page,
      limit,
    })

    return Response.json(result)
  } catch (error) {
    console.error('[partner/povprasevanja] error:', error)
    return handleServiceError(error)
  }
}
