import { getPartner } from '@/lib/supabase-partner'
import { NextResponse } from 'next/server'
import { partnerService, handleServiceError } from '@/lib/services'

/**
 * GET — partner's assigned inquiries with filters
 */
export async function GET(req: Request) {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    return NextResponse.json(result)
  } catch (error) {
    console.error('[partner/povprasevanja] error:', error)
    return handleServiceError(error)
  }
}
