import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

/**
 * Create payment intent when narocnik accepts ponudba
 */
export async function createPaymentIntent(params: {
  amount: number
  povprasevanjeId: string
  ponudbaId: string
  narocnikEmail: string
}): Promise<{ clientSecret: string | null; error?: string }> {
  try {
    const commissionPct =
      parseInt(process.env.STRIPE_PLATFORM_COMMISSION_PCT || '10', 10) / 100
    const commissionAmount = Math.round(params.amount * commissionPct)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: 'eur',
      metadata: {
        povprasevanje_id: params.povprasevanjeId,
        ponudba_id: params.ponudbaId,
        platform: 'liftgo',
        commission_amount: commissionAmount.toString(),
      },
      description: `LiftGO - Povpraševanje ${params.povprasevanjeId}`,
      receipt_email: params.narocnikEmail,
    })

    // Save payment intent ID to ponudba
    const supabase = await createClient()
    await supabase
      .from('ponudbe')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', params.ponudbaId)

    return { clientSecret: paymentIntent.client_secret }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] createPaymentIntent error:', errorMessage)
    return { clientSecret: null, error: errorMessage }
  }
}

/**
 * Create Stripe Connect account for obrtnik
 */
export async function createObrtnikStripeAccount(params: {
  email: string
  businessName: string
  obrtknikId: string
}): Promise<{ accountId: string | null; error?: string }> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'SI',
      email: params.email,
      business_profile: {
        name: params.businessName,
        mcc: '7299', // Business/Professional Services
      },
    })

    // Save account ID to obrtnik_profiles
    const supabase = await createClient()
    await supabase
      .from('obrtnik_profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', params.obrtknikId)

    return { accountId: account.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] createObrtnikStripeAccount error:', errorMessage)
    return { accountId: null, error: errorMessage }
  }
}

/**
 * Create onboarding link for obrtnik to complete Stripe setup
 */
export async function createOnboardingLink(
  stripeAccountId: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/obrtnik/profil`,
      return_url: `${appUrl}/obrtnik/profil?stripe=connected`,
      type: 'account_onboarding',
    })

    return { url: accountLink.url }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] createOnboardingLink error:', errorMessage)
    return { url: null, error: errorMessage }
  }
}

/**
 * Transfer commission to obrtnik after job completion
 */
export async function transferToObrtnik(params: {
  amount: number
  stripeAccountId: string
  ponudbaId: string
}): Promise<{ transferId: string | null; error?: string }> {
  try {
    const commissionPct =
      parseInt(process.env.STRIPE_PLATFORM_COMMISSION_PCT || '10', 10) / 100
    const commissionAmount = Math.round(params.amount * commissionPct)
    const payoutAmount = params.amount - commissionAmount

    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: 'eur',
      destination: params.stripeAccountId,
      metadata: {
        ponudba_id: params.ponudbaId,
      },
      description: `LiftGO payout for ponudba ${params.ponudbaId}`,
    })

    // Save transfer to payouts table
    const supabase = await createClient()
    const { data: ponudba } = await supabase
      .from('ponudbe')
      .select('obrtnik_id, povprasevanje_id')
      .eq('id', params.ponudbaId)
      .single()

    if (ponudba) {
      await supabase.from('payouts').insert({
        ponudba_id: params.ponudbaId,
        obrtnik_id: ponudba.obrtnik_id,
        amount_eur: params.amount,
        commission_eur: commissionAmount,
        stripe_transfer_id: transfer.id,
        status: 'completed',
      })
    }

    return { transferId: transfer.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] transferToObrtnik error:', errorMessage)
    return { transferId: null, error: errorMessage }
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(
  paymentIntentId: string
): Promise<{ status: string; error?: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    )
    return { status: paymentIntent.status }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] getPaymentStatus error:', errorMessage)
    return { status: 'unknown', error: errorMessage }
  }
}

/**
 * Get Stripe account balance for obrtnik
 */
export async function getAccountBalance(
  stripeAccountId: string
): Promise<{ available: number; pending: number; error?: string }> {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    })

    const available =
      balance.available.find((b) => b.currency === 'eur')?.amount || 0
    const pending =
      balance.pending.find((b) => b.currency === 'eur')?.amount || 0

    return { available, pending }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[payments] getAccountBalance error:', errorMessage)
    return { available: 0, pending: 0, error: errorMessage }
  }
}

export default {
  createPaymentIntent,
  createObrtnikStripeAccount,
  createOnboardingLink,
  transferToObrtnik,
  getPaymentStatus,
  getAccountBalance,
}
