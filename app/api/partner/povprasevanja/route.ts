import { getAuthenticatedPartner } from '@/lib/partner/resolver'
import { canonicalPartnerService } from '@/lib/partner/service'
import { NextResponse } from 'next/server'

/**
 * GET — partner's assigned inquiries with filters (canonical: obrtnik_id)
 */
export async function GET(req: Request) {
  const partner = await getAuthenticatedPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const page = parseInt(searchParams.get('page') || '1')

  try {
    const result = await canonicalPartnerService.getInquiries(partner.partnerId, {
      status,
      page,
      limit: 10,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[partner/povprasevanja] error:', error)
    return NextResponse.json({ error: 'Napaka pri pridobivanju povpraševanj' }, { status: 500 })
  }
}
