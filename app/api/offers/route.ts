import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin'

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    let query = supabase.from('offers').select('*').order('created_at', { ascending: false })

    if (!isAdmin) {
      // Non-admins see offers where they are partner OR customer
      // Assuming offers table has partner_id and customer_id columns
      // Filter using RLS policies or explicit filtering
      query = query.or(`partner_id.eq.${user.id},customer_id.eq.${user.id}`)
    } else if (partnerId) {
      // Admins can filter by partner if specified
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { partner_id, request_id, title, description, price, estimated_duration, notes } = body

    // Validation
    if (!partner_id || !request_id || !title || !price) {
      return NextResponse.json(
        { success: false, error: 'Manjkajo zahtevani podatki' },
        { status: 400 }
      )
    }

    // Verify user owns the povprasevanja (request) they're creating an offer for
    const { data: inquiry } = await supabaseAdmin
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', request_id)
      .maybeSingle()

    if (!inquiry || inquiry.narocnik_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - you do not own this request' },
        { status: 403 }
      )
    }

    // Verify partner owns the provided partner_id
    const { data: partnerProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', partner_id)
      .eq('id', user.id)
      .maybeSingle()

    if (!partnerProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid partner' },
        { status: 403 }
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
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: offer })
  } catch (error: any) {
    console.error('[API] Error creating offer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
