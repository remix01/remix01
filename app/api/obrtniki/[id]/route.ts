import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'

const resend = getResendClient()

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { data: current } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, is_verified, verification_status, blocked_reason')
    .eq('id', id)
    .maybeSingle()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (body.status === 'verified') {
    updates.is_verified = true
    updates.verification_status = 'verified'
    updates.verified_at = new Date().toISOString()
    updates.blocked_reason = null
  } else if (body.status === 'blocked') {
    updates.is_verified = false
    updates.verification_status = 'blocked'
    updates.is_available = false
    if (body.blocked_reason) updates.blocked_reason = body.blocked_reason
  } else if (body.status === 'pending') {
    updates.is_verified = false
    updates.verification_status = 'pending'
  }

  const { data, error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction(admin.id, `STATUS_${body.status?.toUpperCase() || 'UPDATE'}`,
    'obrtnik_profiles', id, current, updates)

  // Fetch email from profiles for notifications
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', id)
    .maybeSingle()

  const email = profile?.email
  const ime = profile?.full_name?.split(' ')[0] || 'Obrtnik'

  if (body.status === 'verified' && email && resend) {
    try {
      await resend.emails.send({
        from: getDefaultFrom(),
        to: resolveEmailRecipients(email).to,
        subject: '✓ Vaš profil je verificiran na LiftGO!',
        html: `
          <h2>Čestitamo ${ime}!</h2>
          <p>Vaš profil je bil verificiran. Zdaj boste prejemali povpraševanja.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/dashboard">
            Odprite dashboard →
          </a>
        `,
      })
    } catch {
      console.log('[api/obrtniki] Email send skipped')
    }
  }

  if (body.status === 'blocked' && email && resend) {
    try {
      await resend.emails.send({
        from: getDefaultFrom(),
        to: resolveEmailRecipients(email).to,
        subject: 'LiftGO — Vaš račun je bil blokiran',
        html: `
          <p>Žal vam sporočamo, da je bil vaš račun blokiran.</p>
          <p><strong>Razlog:</strong> ${body.blocked_reason || 'Ni naveden'}</p>
          <p>Za več informacij nas kontaktirajte: info@liftgo.net</p>
        `,
      })
    } catch {
      console.log('[api/obrtniki] Email send skipped')
    }
  }

  return NextResponse.json(data)
}
