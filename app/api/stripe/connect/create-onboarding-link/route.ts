import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'
import { env } from '@/lib/env'
import { ok, fail } from '@/lib/http/response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return fail('Unauthorized', 401)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_account_id) {
      return fail('No Stripe account found. Create one first.', 404)
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

    return ok({ url: accountLink.url })
  } catch (error) {
    console.error('[create-onboarding-link] Error:', error)
    return fail('Internal server error', 500)
  }
}
