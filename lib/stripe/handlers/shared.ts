import Stripe from 'stripe'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function syncConnectedAccountStatus(connectedAccountId: string) {
  try {
    const { data: canonicalPartner } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id')
      .eq('stripe_account_id', connectedAccountId)
      .maybeSingle()

    if (!canonicalPartner) {
      console.log(`[WEBHOOK] Connect account ${connectedAccountId} not found in obrtnik_profiles`)
      return
    }

    const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover' as any,
    })
    const account = await stripeClient.accounts.retrieve(connectedAccountId)

    const newStatus = account.details_submitted
      ? (account.charges_enabled ? 'active' : 'pending')
      : 'incomplete'

    await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ stripe_account_id: connectedAccountId })
      .eq('id', canonicalPartner.id)

    console.log(`[WEBHOOK] Connect account ${connectedAccountId} synced (canonical): → ${newStatus}`)
  } catch (err) {
    console.error(`[WEBHOOK] Failed to sync connect account ${connectedAccountId}:`, err)
  }
}
