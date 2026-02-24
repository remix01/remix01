import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPonudba } from '@/lib/dal/ponudbe'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit check
    const { allowed, retryAfter } = checkRateLimit(
      `ponudbe:${user.id}`,
      10,      // max 10 ponudb
      60_000   // per minute
    )
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Preveč zahtevkov. Poskusite čez ${retryAfter}s.` },
        { status: 429 }
      )
    }

    // Parse request body
    const { povprasevanje_id, obrtnik_id, message, price_estimate, price_type, available_date } = await request.json()

    if (!povprasevanje_id || !obrtnik_id || !message || !price_estimate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Price validation
    const price = Number(price_estimate)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cena mora biti pozitivno število' },
        { status: 400 }
      )
    }
    if (price > 999_999) {
      return NextResponse.json(
        { success: false, error: 'Cena presega dovoljeno mejo' },
        { status: 400 }
      )
    }

    // Validate price_type against allowed values
    const allowedPriceTypes = ['fixed', 'hourly', 'estimate']
    if (price_type && !allowedPriceTypes.includes(price_type)) {
      return NextResponse.json(
        { success: false, error: 'Neveljaven tip cene' },
        { status: 400 }
      )
    }

    // Validate date if provided
    if (available_date) {
      const date = new Date(available_date)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Neveljaven datum' },
          { status: 400 }
        )
      }
    }

    // Verify obrtnik owns this profile
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', obrtnik_id)
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create ponudba
    const ponudba = await createPonudba({
      povprasevanje_id,
      obrtnik_id,
      message,
      price_estimate,
      price_type,
      available_date,
      status: 'poslana'
    })

    if (!ponudba) {
      return NextResponse.json(
        { success: false, error: 'Failed to create ponudba' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, ponudba })
  } catch (error) {
    console.error('[v0] Error creating ponudba:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
