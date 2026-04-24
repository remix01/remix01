import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'
import { env } from '@/lib/env'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Create one first.' },
        { status: 404 }
      )
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

    // v2 account links use use_case instead of the legacy type/refresh_url/return_url shape.
    const stripe = getStripeInstance() as any
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: profile.stripe_account_id,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient', 'merchant'],
          refresh_url: `${baseUrl}/obrtnik/narocnine?stripe_refresh=true`,
          return_url: `${baseUrl}/obrtnik/narocnine?stripe_connected=true`,
        },
      },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('[create-onboarding-link] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
