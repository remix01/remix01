import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CANONICAL_TABLES, CANONICAL_PROVIDER_RELATIONSHIP } from '@/lib/db/schema-contract'
import { assertCanAccessProviderDashboard, OnboardingGuardError } from '@/lib/onboarding/guards'

const requestSchema = z.object({
  accountId: z.string().optional(),
})

export async function POST(request: Request) {
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
      await assertCanAccessProviderDashboard(user.id)
    } catch (error) {
      if (error instanceof OnboardingGuardError) {
        return NextResponse.json({ error: error.message, state: error.state, redirectTo: error.redirectTo }, { status: 403 })
      }
      throw error
    }

    const { data: providerProfile, error: providerError } = await supabaseAdmin
      .from(CANONICAL_TABLES.provider)
      .select('id, stripe_account_id')
      .eq(CANONICAL_PROVIDER_RELATIONSHIP.key, user.id)
      .single()

    if (providerError || !providerProfile) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      )
    }

    if (!providerProfile.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Create one first.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validatedData = requestSchema.parse(body)
    const accountId = validatedData.accountId ?? providerProfile.stripe_account_id

    // Verify the account ID matches the user's account
    if (accountId !== providerProfile.stripe_account_id) {
      return NextResponse.json(
        { error: 'Account ID mismatch' },
        { status: 403 }
      )
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL
    const account = await stripe.accounts.retrieve(accountId)
    const onboardingLinkType = account.details_submitted ? 'account_update' : 'account_onboarding'

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/stripe-return?refresh=true`,
      return_url: `${baseUrl}/dashboard/stripe-return?success=true`,
      type: onboardingLinkType,
    })

    return NextResponse.json({
      url: accountLink.url,
      type: onboardingLinkType,
    })

  } catch (error) {
    console.error('[create-onboarding-link] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
