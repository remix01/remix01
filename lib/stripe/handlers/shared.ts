import Stripe from 'stripe'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'

/**
 * Determine account status from a v2 recipient account.
 * Returns 'active' when transfers capability is active, 'pending' while
 * KYC is under review, and 'incomplete' otherwise.
 */
function statusFromV2Account(account: any): 'active' | 'pending' | 'incomplete' {
  const transferStatus: string =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? ''
  if (transferStatus === 'active') return 'active'
  if (transferStatus === 'pending') return 'pending'
  return 'incomplete'
}

/**
 * Sync a connected account's status to all relevant DB rows.
 *
 * Tries the v2 Accounts API first (for accounts created via the v2 flow),
 * falls back to the v1 API for legacy Express accounts.
 */
export async function syncConnectedAccountStatus(connectedAccountId: string) {
  try {
    const stripe = getStripeInstance() as any

    let newStatus: 'active' | 'pending' | 'incomplete'
    let chargesEnabled: boolean
    let detailsSubmitted: boolean
    let payoutsEnabled: boolean

    try {
      // v2 path: retrieve with recipient configuration to read capability status.
      const account = await stripe.v2.core.accounts.retrieve(connectedAccountId, {
        include: ['configuration.recipient'],
      })
      newStatus = statusFromV2Account(account)
      chargesEnabled = newStatus === 'active'
      detailsSubmitted = newStatus !== 'incomplete'
      payoutsEnabled = newStatus === 'active'
    } catch {
      // v1 fallback for legacy Express accounts.
      const stripeV1 = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-02-25.clover' as any,
      })
      const account = await stripeV1.accounts.retrieve(connectedAccountId)
      chargesEnabled = account.charges_enabled ?? false
      detailsSubmitted = account.details_submitted ?? false
      payoutsEnabled = account.payouts_enabled ?? false
      newStatus = detailsSubmitted
        ? (chargesEnabled ? 'active' : 'pending')
        : 'incomplete'
    }

    const updates = {
      stripe_account_status: newStatus,
      stripe_charges_enabled: chargesEnabled,
      stripe_details_submitted: detailsSubmitted,
      stripe_payouts_enabled: payoutsEnabled,
      updated_at: new Date().toISOString(),
    }

    // Sync partners table (legacy/partner system).
    const { data: partner } = await supabaseAdmin
      .from('partners')
      .select('id')
      .eq('stripe_account_id', connectedAccountId)
      .maybeSingle()

    if (partner) {
      await supabaseAdmin
        .from('partners')
        .update(updates)
        .eq('id', partner.id)
    }

    // Sync obrtnik_profiles (main marketplace).
    await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ stripe_account_status: newStatus })
      .eq('stripe_account_id', connectedAccountId)

    console.log(`[WEBHOOK] Connect account ${connectedAccountId} synced → ${newStatus}`)
  } catch (err) {
    console.error(`[WEBHOOK] Failed to sync connect account ${connectedAccountId}:`, err)
  }
}
