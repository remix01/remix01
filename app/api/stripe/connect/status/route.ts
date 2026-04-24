import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id, stripe_account_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Obrtnik profile not found' }, { status: 403 })
    }

    if (!profile.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        accountId: null,
        isComplete: false,
        status: 'incomplete',
        transfersActive: false,
      })
    }

    // Retrieve v2 account to check recipient transfer capability.
    const stripe = getStripeInstance() as any
    const account = await stripe.v2.core.accounts.retrieve(
      profile.stripe_account_id,
      { include: ['configuration.recipient'] }
    )

    const transferStatus: string =
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? 'inactive'

    const isComplete = transferStatus === 'active'
    const accountStatus = isComplete ? 'active' : (transferStatus === 'pending' ? 'pending' : 'incomplete')

    // Persist status change so the webhook sync stays consistent.
    if (accountStatus !== profile.stripe_account_status) {
      await supabaseAdmin
        .from('obrtnik_profiles')
        .update({ stripe_account_status: accountStatus })
        .eq('id', user.id)
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: profile.stripe_account_id,
      isComplete,
      status: accountStatus,
      transfersActive: isComplete,
    })
  } catch (error) {
    console.error('[connect-status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
