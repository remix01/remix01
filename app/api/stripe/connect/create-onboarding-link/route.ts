import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

    // Verify user is a craftworker
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role, craftworker_profile(*)')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json(
        { error: 'Only craftworkers can access onboarding' },
        { status: 403 }
      )
    }

    const craftworkerProfile = Array.isArray(dbUser.craftworker_profile) 
      ? dbUser.craftworker_profile[0] 
      : dbUser.craftworker_profile

    if (!craftworkerProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Create one first.' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validatedData = requestSchema.parse(body)
    const accountId = validatedData.accountId ?? craftworkerProfile.stripe_account_id

    // Verify the account ID matches the user's account
    if (accountId !== craftworkerProfile.stripe_account_id) {
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
