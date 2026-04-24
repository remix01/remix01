import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripeInstance } from '@/lib/stripe/client'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return fail('Unauthorized', 401)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return fail('Obrtnik profile not found', 403)

    if (profile.stripe_account_id) {
      return ok({ accountId: profile.stripe_account_id, alreadyExists: true })
    }

    const body = await request.json().catch(() => ({}))
    const contactEmail: string = body.email || user.email || ''
    const displayName: string = body.displayName || 'LiftGO Obrtnik'

    // Create a v2 recipient account — platform collects fees and covers losses.
    const stripe = getStripeInstance() as any
    const account = await stripe.v2.core.accounts.create({
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      display_name: displayName,
      contact_email: contactEmail,
      defaults: {
        responsibilities: {
          losses_collector: 'application',
          fees_collector: 'application',
        },
      },
      dashboard: 'express',
      identity: { country: 'SI' },
      include: [
        'configuration.merchant',
        'configuration.recipient',
        'identity',
        'defaults',
        'configuration.customer',
      ],
    })

    await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ stripe_account_id: account.id, stripe_account_status: 'incomplete' })
      .eq('id', user.id)

    return ok({ accountId: account.id, alreadyExists: false })
  } catch (error) {
    console.error('[create-account] Error:', error)
    return fail('Internal server error', 500)
  }
}
