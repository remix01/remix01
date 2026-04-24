import { NextRequest } from 'next/server'
import { getAgentPricingEstimate } from '@/lib/agent/liftgo-agent'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categorySlug = searchParams.get('categorySlug') || 'default'
    const urgency = searchParams.get('urgency') || 'normalno'

    const isWeekend = [0, 6].includes(new Date().getDay())

    const estimate = await getAgentPricingEstimate({
      categorySlug,
      urgency,
      isWeekend,
    })

    return Response.json(estimate)
  } catch (error) {
    console.error('[v0] Pricing endpoint error:', error)
    return ok({
      estimate: '25-60 EUR/uro',
      notes: 'Splošna ocena — dejanska cena se lahko razlikuje',
    })
  }
}
