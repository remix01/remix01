import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'
import { ok, fail } from '@/lib/http/response'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return fail('Unauthorized', 401)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id, stripe_account_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return fail('Obrtnik profile not found', 403)

    if (!profile.stripe_account_id) {
      return ok({
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
    const accountStatus = isComplete
      ? 'active'
      : transferStatus === 'pending' ? 'pending' : 'incomplete'

    if (accountStatus !== profile.stripe_account_status) {
      await supabaseAdmin
        .from('obrtnik_profiles')
        .update({ stripe_account_status: accountStatus })
        .eq('id', user.id)
    }

    return ok({
      hasAccount: true,
      accountId: profile.stripe_account_id,
      isComplete,
      status: accountStatus,
      transfersActive: isComplete,
    })
  } catch (error) {
    console.error('[connect-status] Error:', error)
    return fail('Internal server error', 500)
  }
}
