import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with craftworker profile
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role, craftworker_profile(*)')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json(
        { error: 'Only craftworkers can check Stripe status' },
        { status: 403 }
      )
    }

    const craftworkerProfile = Array.isArray(dbUser.craftworker_profile) 
      ? dbUser.craftworker_profile[0] 
      : dbUser.craftworker_profile

    if (!craftworkerProfile?.stripe_account_id) {
      return NextResponse.json({
        isComplete: false,
        hasAccount: false,
        needsInfo: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        restrictionReason: null
      })
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(
      craftworkerProfile.stripe_account_id
    )

    const isComplete = 
      account.charges_enabled === true && 
      account.details_submitted === true &&
      account.payouts_enabled === true

    // Update database if status changed
    if (isComplete !== craftworkerProfile.stripe_onboarding_complete) {
      await supabaseAdmin
        .from('craftworker_profile')
        .update({ stripe_onboarding_complete: isComplete })
        .eq('user_id', user.id)
    }

    // Determine if more info is needed
    const needsInfo = account.details_submitted === false || 
                     (account.requirements?.currently_due?.length ?? 0) > 0

    // Get restriction reason if exists
    let restrictionReason = null
    if (account.requirements?.disabled_reason) {
      restrictionReason = account.requirements.disabled_reason
    }

    return NextResponse.json({
      isComplete,
      hasAccount: true,
      needsInfo,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      restrictionReason,
      currentlyDue: account.requirements?.currently_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? []
    })

  } catch (error) {
    console.error('[stripe-status] Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
