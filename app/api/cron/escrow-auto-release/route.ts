import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { updateEscrowStatus } from '@/lib/escrow'

export async function GET(request: NextRequest) {
  // Zavaruj cron endpoint z secret headerjem
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Poišči vse 'paid' transakcije ki so presegle release_due_at
  const { data: overdueList, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, stripe_payment_intent_id, payout_cents')
    .eq('status', 'paid')
    .lt('release_due_at', new Date().toISOString())
    .limit(20)  // Varnostni limit na eno izvajanje

  if (error) {
    console.error('[CRON AUTO-RELEASE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []
  for (const tx of overdueList ?? []) {
    try {
      await stripe.paymentIntents.capture(tx.stripe_payment_intent_id)
      await updateEscrowStatus({
        transactionId: tx.id,
        newStatus:     'released',
        actor:         'system',
        actorId:       'cron-auto-release',
        extraFields:   { released_at: new Date().toISOString() },
        metadata:      { reason: 'auto_release_timeout' },
      })
      results.push({ id: tx.id, status: 'released' })
    } catch (err) {
      console.error('[CRON] Failed for tx:', tx.id, err)
      results.push({ id: tx.id, status: 'error' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
