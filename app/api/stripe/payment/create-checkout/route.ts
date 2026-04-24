import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { calculateEscrow } from '@/lib/stripe/escrow'
import { env } from '@/lib/env'

/**
 * Create a Checkout Session for a marketplace job payment.
 *
 * The platform collects an application fee (commission) and transfers the
 * remainder to the craftsman's connected Stripe account.
 *
 * Body: { ponudbaId: string, successUrl?: string, cancelUrl?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ponudbaId, successUrl, cancelUrl } = await req.json()

    if (!ponudbaId) {
      return NextResponse.json({ error: 'ponudbaId is required' }, { status: 400 })
    }

    // Look up the offer and the craftsman's Stripe account in a single query.
    const { data: ponudba, error: ponudbaError } = await supabaseAdmin
      .from('ponudbe')
      .select(`
        id,
        price_estimate,
        obrtnik_id,
        povprasevanje_id,
        obrtnik_profiles!ponudbe_obrtnik_id_fkey (
          stripe_account_id,
          subscription_tier,
          stripe_account_status
        )
      `)
      .eq('id', ponudbaId)
      .eq('status', 'sprejeta')
      .single()

    if (ponudbaError || !ponudba) {
      return NextResponse.json(
        { error: 'Offer not found or not in accepted state' },
        { status: 404 }
      )
    }

    const obrtnikProfile = Array.isArray(ponudba.obrtnik_profiles)
      ? ponudba.obrtnik_profiles[0]
      : ponudba.obrtnik_profiles

    if (!obrtnikProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Craftsman has not connected a Stripe account yet' },
        { status: 422 }
      )
    }

    if (obrtnikProfile.stripe_account_status !== 'active') {
      return NextResponse.json(
        { error: 'Craftsman Stripe account is not yet active' },
        { status: 422 }
      )
    }

    if (!ponudba.price_estimate || ponudba.price_estimate <= 0) {
      return NextResponse.json(
        { error: 'Offer has no valid price' },
        { status: 422 }
      )
    }

    const amountCents = Math.round(Number(ponudba.price_estimate) * 100)
    const tier = (obrtnikProfile.subscription_tier === 'pro' || obrtnikProfile.subscription_tier === 'elite')
      ? 'pro'
      : 'start'
    const { commissionCents } = calculateEscrow(amountCents, tier)

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    const resolvedSuccessUrl = successUrl
      ?? `${baseUrl}/narocnik/povprasevanja/${ponudba.povprasevanje_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`
    const resolvedCancelUrl = cancelUrl
      ?? `${baseUrl}/narocnik/povprasevanja/${ponudba.povprasevanje_id}?payment=cancelled`

    const session = await stripe.checkout.sessions.create({
      success_url: resolvedSuccessUrl,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Storitev LiftGO' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: commissionCents,
        transfer_data: {
          destination: obrtnikProfile.stripe_account_id,
        },
      },
      metadata: {
        ponudba_id: ponudbaId,
        obrtnik_id: ponudba.obrtnik_id,
        narocnik_id: user.id,
      },
    } as any)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[payment/create-checkout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
