import { getErrorMessage } from '@/lib/utils/error'
import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { fail, ok } from '@/lib/http/response'

export async function POST(req: NextRequest) {
  try {
    const { amount, craftsmanId, offerId } = await req.json()

    if (!amount || !craftsmanId || !offerId) return fail('Missing required fields', 400)

    // Get Supabase client
    const supabase = await createClient()

    // Get partner info to determine commission rate
    const { data: partner, error: partnerError } = await supabase
      .from('obrtnik_profiles')
      .select('id, stripe_account_id, subscription_tier')
      .eq('id', craftsmanId)
      .maybeSingle()

    if (partnerError || !partner) return fail('Partner not found', 404)

    // Determine commission rate based on subscription tier
    // START = 10%, PRO = 5%
    const commissionRate = partner.subscription_tier === 'pro' ? 0.05 : 0.10
    const applicationFeeAmount = Math.round(amount * commissionRate)

    // Create PaymentIntent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents (EUR)
      currency: 'eur',
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: partner.stripe_account_id!, // Craftsman's Stripe Connect account
      },
      metadata: {
        offerId,
        craftsmanId,
        commissionRate: (commissionRate * 100).toString(),
      },
    })

    return ok({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: unknown) {
    console.error('[v0] Payment Intent creation error:', error)
    return fail(getErrorMessage(error) || 'Failed to create payment intent', 500)
  }
}
