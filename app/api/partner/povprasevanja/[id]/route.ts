import { getPartner } from '@/lib/supabase-partner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * PATCH — partner accepts/rejects/completes inquiry
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify this inquiry belongs to this partner
  const { data: inquiry } = await supabaseAdmin
    .from('povprasevanja')
    .select('*')
    .eq('id', params.id)
    .eq('obrtnik_id', partner.id)
    .single()

  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { status, cena_ocena_min, cena_ocena_max, opomba } = body

  // Validate allowed partner status transitions
  const allowedTransitions: Record<string, string[]> = {
    'dodeljeno': ['sprejeto', 'zavrnjeno'],
    'sprejeto': ['v_izvajanju', 'zavrnjeno'],
    'v_izvajanju': ['zakljuceno'],
  }
  
  if (status && !allowedTransitions[inquiry.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Ne morete spremeniti statusa iz ${inquiry.status} v ${status}` },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (cena_ocena_min) updates.cena_ocena_min = cena_ocena_min
  if (cena_ocena_max) updates.cena_ocena_max = cena_ocena_max
  if (opomba) updates.opomba = opomba

  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email stranka on accept
  if (status === 'sprejeto' && inquiry.stranka_email) {
    try {
      await resend.emails.send({
        from: 'LiftGO <noreply@liftgo.net>',
        to: inquiry.stranka_email,
        subject: `✓ ${partner.ime} je sprejel vaše povpraševanje`,
        html: `
          <h2>Dobra novica!</h2>
          <p><strong>${partner.ime} ${partner.priimek}</strong> je sprejel vaše povpraševanje za <strong>${inquiry.storitev}</strong>.</p>
          ${cena_ocena_min ? `<p><strong>Ocenjena cena:</strong> ${cena_ocena_min}–${cena_ocena_max} EUR</p>` : ''}
          <p>Mojster vas bo kmalu kontaktiral za potrditev termina.</p>
          <p style="color:#64748b;font-size:12px">LiftGO — Tvoj lokalni mojster, takoj pri roki.</p>
        `,
      })
    } catch (emailError) {
      console.log('[v0] Email send failed silently')
    }
  }

  // Email stranka on reject
  if (status === 'zavrnjeno' && inquiry.stranka_email) {
    try {
      await resend.emails.send({
        from: 'LiftGO <noreply@liftgo.net>',
        to: inquiry.stranka_email,
        subject: 'LiftGO — Iščemo vam novega mojstra',
        html: `
          <h2>Obveščamo vas</h2>
          <p>Izbrani mojster trenutno ni na voljo za vaše povpraševanje.</p>
          <p>Naša ekipa vam bo v kratkem dodelila novega mojstra.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/povprasevanje">
            Oddajte novo povpraševanje →
          </a>
        `,
      })
    } catch (emailError) {
      console.log('[v0] Email send failed silently')
    }
  }

  // Notify admin on rejection
  if (status === 'zavrnjeno') {
    await supabaseAdmin.from('admin_log').insert({
      akcija: 'PARTNER_REJECTED',
      tabela: 'povprasevanja',
      zapis_id: params.id,
      novo_stanje: { partner_id: partner.id, opomba },
    }).catch(() => null)
  }

  return NextResponse.json(data)
}

/**
 * GET — partner's assigned inquiries with filters
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify this inquiry belongs to this partner
  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .select('*')
    .eq('id', params.id)
    .eq('obrtnik_id', partner.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
