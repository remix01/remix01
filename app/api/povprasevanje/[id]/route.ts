import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, obrtnik_id, admin_opomba,
          termin_datum, termin_ura,
          cena_ocena_min, cena_ocena_max } = body

  // Get current state for audit log
  const { data: current } = await supabaseAdmin
    .from('povprasevanja')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (status)         updates.status = status
  if (obrtnik_id)     updates.obrtnik_id = obrtnik_id
  if (admin_opomba !== undefined) updates.admin_opomba = admin_opomba
  if (termin_datum)   updates.termin_datum = termin_datum
  if (termin_ura)     updates.termin_ura = termin_ura
  if (cena_ocena_min) updates.cena_ocena_min = cena_ocena_min
  if (cena_ocena_max) updates.cena_ocena_max = cena_ocena_max

  // Auto-set status when assigning obrtnik
  if (obrtnik_id && !status) updates.status = 'dodeljeno'

  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log the action
  await logAction(admin.id, 'UPDATE', 'povprasevanja', params.id, current, updates)

  // Notify obrtnik if newly assigned
  if (obrtnik_id && obrtnik_id !== current.obrtnik_id) {
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtniki')
      .select('email, ime')
      .eq('id', obrtnik_id)
      .single()

    if (obrtnik?.email) {
      try {
        await resend.emails.send({
          from: 'LiftGO <noreply@liftgo.net>',
          to: obrtnik.email,
          subject: `LiftGO — Dodeljeno vam je novo povpraševanje`,
          html: `
            <h2>Pozdravljeni ${obrtnik.ime},</h2>
            <p>Admin vam je dodelil novo povpraševanje.</p>
            <p><strong>Storitev:</strong> ${current.storitev}</p>
            <p><strong>Lokacija:</strong> ${current.lokacija}</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/povprasevanja/${params.id}">
              Oglejte si podrobnosti →
            </a>
          `,
        })
        await supabaseAdmin
          .from('povprasevanja')
          .update({ notifikacija_poslana: true, notifikacija_cas: new Date().toISOString() })
          .eq('id', params.id)
      } catch (emailError) {
        console.log('[v0] Email send skipped')
      }
    }
  }

  return NextResponse.json(data)
}
