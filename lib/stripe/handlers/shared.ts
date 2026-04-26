import Stripe from 'stripe'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function syncConnectedAccountStatus(connectedAccountId: string) {
  try {
    // Canonical lookup: obrtnik_profiles has stripe_account_id
    const { data: canonicalPartner } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id')
      .eq('stripe_account_id', connectedAccountId)
      .maybeSingle()

    // Legacy fallback: partners table
    let legacyPartnerId: string | null = null
    let legacyPrevStatus: string | null = null
    if (!canonicalPartner) {
      const { data: legacyPartner } = await supabaseAdmin
        .from('partners')
        .select('id, stripe_account_status')
        .eq('stripe_account_id', connectedAccountId)
        .maybeSingle()

      if (!legacyPartner) {
        console.log(`[WEBHOOK] Connect account ${connectedAccountId} not found in obrtnik_profiles or partners`)
        return
      }

      console.warn(
        JSON.stringify({
          level: 'warn',
          code: 'PARTNER_ID_MAPPING_FALLBACK',
          path: 'partners.stripe_account_id',
          connectedAccountId,
          legacyPartnerId: legacyPartner.id,
          message: 'Stripe connect account resolved via legacy partners table',
        })
      )
      legacyPartnerId = legacyPartner.id
      legacyPrevStatus = legacyPartner.stripe_account_status
    }

    const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover' as any,
    })
    const account = await stripeClient.accounts.retrieve(connectedAccountId)

    const newStatus = account.details_submitted
      ? (account.charges_enabled ? 'active' : 'pending')
      : 'incomplete'

    if (canonicalPartner) {
      await supabaseAdmin
        .from('obrtnik_profiles')
        .update({ stripe_account_id: connectedAccountId })
        .eq('id', canonicalPartner.id)

      console.log(`[WEBHOOK] Connect account ${connectedAccountId} synced (canonical): → ${newStatus}`)
    } else if (legacyPartnerId) {
      await supabaseAdmin
        .from('partners')
        .update({
          stripe_account_status: newStatus,
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
          stripe_payouts_enabled: account.payouts_enabled ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', legacyPartnerId)

      console.log(`[WEBHOOK] Connect account ${connectedAccountId} synced (legacy): ${legacyPrevStatus} → ${newStatus}`)
    }
  } catch (err) {
    console.error(`[WEBHOOK] Failed to sync connect account ${connectedAccountId}:`, err)
  }
}
