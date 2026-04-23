import Stripe from 'stripe'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function syncConnectedAccountStatus(connectedAccountId: string) {
  try {
    const { data: partner } = await supabaseAdmin
      .from('partners')
      .select('id, stripe_account_status')
      .eq('stripe_account_id', connectedAccountId)
      .maybeSingle()

    if (!partner) {
      console.log(`[WEBHOOK] Connect account ${connectedAccountId} not found in partners table`)
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
      .from('partners')
      .update({
        stripe_account_status: newStatus,
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_details_submitted: account.details_submitted ?? false,
        stripe_payouts_enabled: account.payouts_enabled ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', partner.id)

    console.log(
      `[WEBHOOK] Connect account ${connectedAccountId} synced: ${partner.stripe_account_status} → ${newStatus}`
    )
  } catch (err) {
    console.error(`[WEBHOOK] Failed to sync connect account ${connectedAccountId}:`, err)
  }
}
