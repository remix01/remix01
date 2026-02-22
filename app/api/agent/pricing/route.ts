import { NextRequest, NextResponse } from 'next/server'
import { getAgentPricingEstimate } from '@/lib/agent/liftgo-agent'

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

    return NextResponse.json(estimate)
  } catch (error) {
    console.error('[v0] Pricing endpoint error:', error)
    return NextResponse.json(
      {
        estimate: '25-60 EUR/uro',
        notes: 'Splošna ocena — dejanska cena se lahko razlikuje',
      },
      { status: 200 }
    )
  }
}
