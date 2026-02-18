import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEscrowTransaction, updateEscrowStatus, writeAuditLog } from '@/lib/escrow'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 1. AVTENTIKACIJA
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Nepooblaščen dostop.' }, { status: 401 })
    }

    const { escrowId, reason, description } = await request.json()

    if (!reason?.trim()) {
      return NextResponse.json({ success: false, message: 'Navedite razlog spora.' }, { status: 400 })
    }

    // 2. PREBERI TRANSAKCIJO
    const escrow = await getEscrowTransaction(escrowId)

    // 3. SAMO 'paid' TRANSAKCIJE IMAJO LAHKO SPOR
    if (!['paid'].includes(escrow.status)) {
      return NextResponse.json(
        { success: false, message: 'Spor je možen samo pri plačani transakciji.' },
        { status: 400 }
      )
    }

    // 4. PREVERI DA SPOR ŠE NI ODPRT
    const { count } = await supabaseAdmin
      .from('escrow_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', escrowId)
    if ((count ?? 0) > 0) {
      return NextResponse.json({ success: false, message: 'Spor je že odprt.' }, { status: 409 })
    }

    // 5. DOLOČI KDO ODPIRA SPOR
    const isPartner  = escrow.partner_id === session.user.id
    const openedBy   = isPartner ? 'partner' : 'customer'

    // 6. USTVARI SPOR
    const { error: disputeErr } = await supabaseAdmin
      .from('escrow_disputes')
      .insert({
        transaction_id: escrowId,
        opened_by:      openedBy,
        opened_by_id:   session.user.id,
        reason:         reason.trim(),
        description:    description?.trim() ?? null,
        status:         'open',
      })

    if (disputeErr) throw new Error(disputeErr.message)

    // 7. POSODOBI ESCROW STATUS
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus:     'disputed',
      actor:         openedBy,
      actorId:       session.user.id,
      metadata:      { reason, openedBy },
    })

    // 8. OBVESTI ADMIN (email prek lib/email.ts)
    // await sendAdminDisputeAlert({ escrowId, openedBy, reason })

    return NextResponse.json({
      success: true,
      message: 'Spor je odprt. Naša ekipa bo pregledala primer v 24 urah.',
    })

  } catch (err) {
    console.error('[ESCROW DISPUTE]', err)
    return NextResponse.json(
      { success: false, message: 'Napaka pri odpiranju spora.' },
      { status: 500 }
    )
  }
}
