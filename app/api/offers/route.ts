import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    let query = supabase.from('offers').select('*').order('created_at', { ascending: false })

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    const { data: offers, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: offers })
  } catch (error: any) {
    console.error('[API] Error fetching offers:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { partner_id, request_id, title, description, price, estimated_duration, notes } = body

    // Validacija
    if (!partner_id || !request_id || !title || !price) {
      return NextResponse.json(
        { success: false, error: 'Manjkajo zahtevani podatki' },
        { status: 400 }
      )
    }

    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        partner_id,
        request_id,
        title,
        description,
        price: parseFloat(price),
        estimated_duration,
        notes,
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: offer })
  } catch (error: any) {
    console.error('[API] Error creating offer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
