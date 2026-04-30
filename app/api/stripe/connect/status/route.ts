import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CANONICAL_TABLES, CANONICAL_PROVIDER_RELATIONSHIP } from '@/lib/db/schema-contract'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'
import { assertCanAccessProviderDashboard, OnboardingGuardError } from '@/lib/onboarding/guards'

function isMissingColumnError(error: { code?: string; message?: string; details?: string }, field: string): boolean {
  const code = error.code?.toUpperCase() ?? ''
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  return code === '42703' ||
    code === 'PGRST204' ||
    haystack.includes(`column "${field.toLowerCase()}"`) ||
    haystack.includes(`'${field.toLowerCase()}'`) ||
    haystack.includes('schema cache') ||
    haystack.includes('could not find the') ||
    haystack.includes('not found in the schema cache')
}

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

    try {
      await assertCanAccessProviderDashboard(user.id, { allowStates: ['payout_incomplete'] })
    } catch (error) {
      if (error instanceof OnboardingGuardError) {
        return NextResponse.json({ error: error.message, state: error.state, redirectTo: error.redirectTo }, { status: 403 })
      }
      throw error
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from(CANONICAL_TABLES.user)
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'obrtnik') {
      return NextResponse.json(
        { error: 'Only providers can check Stripe status' },
        { status: 403 }
      )
    }

    const { data: providerProfile, error: providerError } = await supabaseAdmin
      .from(CANONICAL_TABLES.provider)
      .select('id, stripe_account_id, stripe_onboarded')
      .eq(CANONICAL_PROVIDER_RELATIONSHIP.key, user.id)
      .single()
    if (providerError || !providerProfile) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      )
    }

    if (!providerProfile.stripe_account_id) {
      return NextResponse.json({
        isComplete: false,
        hasAccount: false,
        accountId: null,
        needsInfo: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        restrictionReason: null
      })
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(
      providerProfile.stripe_account_id
    )

    const isComplete = 
      account.charges_enabled === true && 
      account.details_submitted === true &&
      account.payouts_enabled === true

    const skippedFields: string[] = []
    const updatePayloadBase = {
      stripe_onboarded: isComplete,
      stripe_charges_enabled: account.charges_enabled === true,
      stripe_payouts_enabled: account.payouts_enabled === true,
      stripe_details_submitted: account.details_submitted === true,
      stripe_requirements_due: account.requirements?.currently_due ?? []
    }
    let updateError: { message?: string } | null = null
    for (const [field, value] of Object.entries(updatePayloadBase)) {
      const { error } = await supabaseAdmin
        .from(CANONICAL_TABLES.provider)
        .update({ [field]: value })
        .eq(CANONICAL_PROVIDER_RELATIONSHIP.key, user.id)
      if (error) {
        if (isMissingColumnError(error, field)) {
          skippedFields.push(field)
          continue
        }
        updateError = error
        break
      }
    }
    if (updateError) throw new Error(updateError.message || 'Failed to persist Stripe status')

    try {
      await transitionOnboardingState(user.id)
    } catch (onboardingError) {
      console.error('[stripe-status] Failed onboarding transition:', onboardingError)
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
      accountId: providerProfile.stripe_account_id,
      needsInfo,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      restrictionReason,
      currentlyDue: account.requirements?.currently_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? [],
      skippedPersistedFields: skippedFields
    })

  } catch (error) {
    console.error('[stripe-status] Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
