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
  const { data: current } = await supabaseAdmin
    .from('obrtniki').select('*').eq('id', params.id).single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { ...body }

  if (body.status === 'verified') {
    updates.verified_at = new Date().toISOString()
    updates.blocked_at = null
    updates.blocked_reason = null
  }
  if (body.status === 'blocked') {
    updates.blocked_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('obrtniki').update(updates).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction(admin.id, `STATUS_${body.status?.toUpperCase() || 'UPDATE'}`,
    'obrtniki', params.id, current, updates)

  // Email obrtnik on verification
  if (body.status === 'verified' && current.email) {
    try {
      await resend.emails.send({
        from: 'LiftGO <noreply@liftgo.net>',
        to: current.email,
        subject: '✓ Vaš profil je verificiran na LiftGO!',
        html: `
          <h2>Čestitamo ${current.ime}!</h2>
          <p>Vaš profil je bil verificiran. Zdaj boste prejemali povpraševanja.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/dashboard">
            Odprite dashboard →
          </a>
        `,
      })
    } catch (emailError) {
      console.log('[v0] Email send skipped')
    }
  }

  if (body.status === 'blocked' && current.email) {
    try {
      await resend.emails.send({
        from: 'LiftGO <noreply@liftgo.net>',
        to: current.email,
        subject: 'LiftGO — Vaš račun je bil blokiran',
        html: `
          <p>Žal vam sporočamo, da je bil vaš račun blokiran.</p>
          <p><strong>Razlog:</strong> ${body.blocked_reason || 'Ni naveden'}</p>
          <p>Za več informacij nas kontaktirajte: info@liftgo.net</p>
        `,
      })
    } catch (emailError) {
      console.log('[v0] Email send skipped')
    }
  }

  return NextResponse.json(data)
}
