import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * PATCH - update partner's own offer
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const rawPrice = typeof body.price_estimate === 'number' ? body.price_estimate : Number(body.price_estimate)
  const availableDate =
    typeof body.available_date === 'string' && body.available_date.length > 0
      ? body.available_date
      : null

  if (!title || !message) {
    return NextResponse.json({ error: 'Naslov in sporočilo sta obvezna.' }, { status: 400 })
  }

  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    return NextResponse.json({ error: 'Cena mora biti večja od 0.' }, { status: 400 })
  }

  const { data: currentOffer, error: fetchError } = await supabase
    .from('ponudbe')
    .select('id, status, obrtnik_id')
    .eq('id', id)
    .eq('obrtnik_id', user.id)
    .maybeSingle()

  if (fetchError || !currentOffer) {
    return NextResponse.json({ error: 'Ponudba ni bila najdena.' }, { status: 404 })
  }

  if (currentOffer.status === 'sprejeta' || currentOffer.status === 'zavrnjena') {
    return NextResponse.json(
      { error: 'Sprejetih ali zavrnjenih ponudb ni mogoče urejati.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('ponudbe')
    .update({
      title,
      message,
      price_estimate: rawPrice,
      available_date: availableDate,
    })
    .eq('id', id)
    .eq('obrtnik_id', user.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

/**
 * DELETE - remove partner's own offer
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: currentOffer, error: fetchError } = await supabase
    .from('ponudbe')
    .select('id, status')
    .eq('id', id)
    .eq('obrtnik_id', user.id)
    .maybeSingle()

  if (fetchError || !currentOffer) {
    return NextResponse.json({ error: 'Ponudba ni bila najdena.' }, { status: 404 })
  }

  if (currentOffer.status === 'sprejeta') {
    return NextResponse.json(
      { error: 'Sprejete ponudbe ni mogoče izbrisati.' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('ponudbe')
    .delete()
    .eq('id', id)
    .eq('obrtnik_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
