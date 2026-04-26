import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateOfferPayload } from '@/lib/types/offer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateOfferPayload = await req.json()
  const { povprasevanje_id, message, price_estimate, price_type, available_date } = body

  if (!povprasevanje_id) {
    return NextResponse.json({ error: 'Povpraševanje je obvezno.' }, { status: 400 })
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
  }
  if (!Number.isFinite(price_estimate) || price_estimate <= 0) {
    return NextResponse.json({ error: 'Cena mora biti večja od 0.' }, { status: 400 })
  }

  // Prevent duplicate offers for the same inquiry
  const { data: existing } = await supabase
    .from('ponudbe')
    .select('id')
    .eq('povprasevanje_id', povprasevanje_id)
    .eq('obrtnik_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Za to povpraševanje ste že oddali ponudbo.' },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('ponudbe')
    .insert({
      povprasevanje_id,
      obrtnik_id: user.id,
      message: message.trim(),
      price_estimate,
      price_type: price_type ?? 'ocena',
      status: 'poslana',
      available_date: available_date ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[POST /api/partner/offers] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
