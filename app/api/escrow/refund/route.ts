import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEscrowTransaction, updateEscrowStatus } from '@/lib/escrow'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 1. AVTENTIKACIJA — samo admin
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    const isAdmin = session?.user.user_metadata?.role === 'admin'
    if (!session || !isAdmin) {
      return NextResponse.json({ success: false, message: 'Samo admin.' }, { status: 403 })
    }

    const { escrowId, reason, amountCents } = await request.json()

    // 2. PREBERI TRANSAKCIJO
    const escrow = await getEscrowTransaction(escrowId)

    // 3. SAMO 'paid' SE LAHKO VRNE
    if (escrow.status !== 'paid') {
      return NextResponse.json(
        { success: false, message: `Status '${escrow.status}' ne dovoljuje vrnitve.` },
        { status: 400 }
      )
    }

    // 4. PREKLICI PAYMENT INTENT (bo vrnil celotno rezervacijo)
    const refund = await stripe.paymentIntents.cancel(
      escrow.stripe_payment_intent_id,
      { cancellation_reason: 'requested_by_customer' }
    )

    // 5. POSODOBI DB
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus:     'refunded',
      actor:         'admin',
      actorId:       session.user.id,
      extraFields: {
        refunded_at:     new Date().toISOString(),
        stripe_refund_id: refund.id,
      },
      metadata: { reason: reason ?? 'Admin refund', requestedAmountCents: amountCents },
    })

    return NextResponse.json({
      success: true,
      message: 'Vrnitev uspešna. Stranka bo prejela sredstva v 5–10 delovnih dneh.',
    })

  } catch (err) {
    console.error('[ESCROW REFUND]', err)
    return NextResponse.json(
      { success: false, message: 'Napaka pri vračilu.' },
      { status: 500 }
    )
  }
}
