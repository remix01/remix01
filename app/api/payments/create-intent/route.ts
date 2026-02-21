import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent } from '@/lib/mcp/payments'

export async function POST(request: NextRequest) {
  try {
    const { ponudbaId } = await request.json()

    if (!ponudbaId) {
      return NextResponse.json(
        { error: 'ponudbaId is required' },
        { status: 400 }
      )
    }

    // 1. Auth check - must be narocnik
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not logged in' },
        { status: 401 }
      )
    }

    // Verify user is narocnik
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'narocnik') {
      return NextResponse.json(
        { error: 'Unauthorized - not a narocnik' },
        { status: 403 }
      )
    }

    // 2. Fetch ponudba with povprasevanje
    const { data: ponudba, error: ponudbaError } = await supabase
      .from('ponudbe')
      .select(`
        *,
        povprasevanja(*)
      `)
      .eq('id', ponudbaId)
      .single()

    if (ponudbaError || !ponudba) {
      return NextResponse.json(
        { error: 'Ponudba not found' },
        { status: 404 }
      )
    }

    // 3. Verify ponudba.status = 'sprejeta'
    if (ponudba.status !== 'sprejeta') {
      return NextResponse.json(
        { error: 'Ponudba must be accepted first' },
        { status: 400 }
      )
    }

    // 4. Verify ownership - narocnik must own the povprasevanje
    const povprasevanje = ponudba.povprasevanja
    if (povprasevanje.narocnik_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - not the povprasevanje owner' },
        { status: 403 }
      )
    }

    // 5. Create payment intent
    const amount = Math.round((ponudba.price_estimate || 0) * 100) // Convert to cents
    const result = await createPaymentIntent({
      amount,
      povprasevanjeId: ponudba.povprasevanja_id,
      ponudbaId,
      narocnikEmail: user.email || '',
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clientSecret: result.clientSecret,
      amount,
      currency: 'eur',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/payments/create-intent] error:', errorMessage)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

