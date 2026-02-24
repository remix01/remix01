import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.json()
  const { storitev, lokacija, opis, stranka_ime,
          stranka_email, stranka_telefon,
          obrtnik_id, termin_datum, termin_ura } = body

  if (!storitev || !lokacija || !opis || !stranka_ime) {
    return NextResponse.json({ error: 'Manjkajo obvezna polja' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .insert({
      storitev, lokacija, opis, stranka_ime,
      stranka_email, stranka_telefon,
      obrtnik_id: obrtnik_id || null,
      termin_datum: termin_datum || null,
      termin_ura: termin_ura || null,
      status: obrtnik_id ? 'dodeljeno' : 'novo',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to obrtnik if assigned
  if (obrtnik_id && stranka_email) {
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtniki')
      .select('email, ime, priimek')
      .eq('id', obrtnik_id)
      .single()

    if (obrtnik?.email) {
      try {
        await resend.emails.send({
          from: 'LiftGO <noreply@liftgo.net>',
          to: obrtnik.email,
          subject: `Novo povpraševanje — ${storitev}`,
          html: `
            <h2>Novo povpraševanje</h2>
            <p><strong>Storitev:</strong> ${storitev}</p>
            <p><strong>Lokacija:</strong> ${lokacija}</p>
            <p><strong>Opis:</strong> ${opis}</p>
            <p><strong>Stranka:</strong> ${stranka_ime}</p>
            ${termin_datum ? `<p><strong>Termin:</strong> ${termin_datum} ob ${termin_ura}</p>` : ''}
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/povprasevanja/${data.id}">
              Ogled povpraševanja →
            </a>
          `,
        })
        await supabaseAdmin
          .from('povprasevanja')
          .update({ notifikacija_poslana: true, notifikacija_cas: new Date().toISOString() })
          .eq('id', data.id)
      } catch (emailError) {
        console.log('[v0] Email send skipped')
      }
    }
  }

  return NextResponse.json({ id: data.id, status: data.status }, { status: 201 })
}

export async function GET(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const search   = searchParams.get('search')
  const page     = parseInt(searchParams.get('page') || '1')
  const limit    = parseInt(searchParams.get('limit') || '20')
  const offset   = (page - 1) * limit

  let query = supabaseAdmin
    .from('povprasevanja')
    .select(`
      *, 
      obrtniki (id, ime, priimek, email, telefon, ocena)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'vse') query = query.eq('status', status)
  if (search) query = query.or(
    `stranka_ime.ilike.%${search}%,storitev.ilike.%${search}%,lokacija.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}
