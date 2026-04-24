import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { getStripePriceId, isValidPlan, type PlanType } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { paymentLimiter } from '@/lib/rate-limit/limiters'
import { fail, ok } from '@/lib/http/response'

function getBaseUrl(req: Request): string {
  if (env.NEXT_PUBLIC_APP_URL) {
    const url = env.NEXT_PUBLIC_APP_URL.trim()
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace(/\/$/, '')
    }
    return 'https://' + url.replace(/\/$/, '')
  }
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`
  }
  return 'https://liftgo.net'
}

async function postHandler(req: NextRequest) {
  try {
    const { plan, email, successPath, cancelPath } = await req.json()

    if (!isValidPlan(plan)) {
      return fail('Neveljaven paket. Izberite veljaven naročniški paket.')
    }

    if (plan === 'START') {
      return fail('START paket je brezplačen. Registracija ne zahteva Stripe plačila.')
    }

    // Pridobi prijavljenega userja za client_reference_id
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const priceId = getStripePriceId(plan as PlanType)
    if (!priceId) {
      console.error(`[Stripe] Manjka priceId za ${plan}`)
      return fail('Konfiguracija plačila manjka. Kontaktirajte info@liftgo.net', 500)
    }

    const baseUrl = getBaseUrl(req)
    console.log('[Stripe] checkout baseUrl:', baseUrl, 'plan:', plan)

    const safeSuccessPath = (typeof successPath === 'string' && successPath.startsWith('/') && !successPath.startsWith('//'))
      ? successPath
      : `/registracija-mojster?plan=${plan.toLowerCase()}&stripe=success&session_id={CHECKOUT_SESSION_ID}`
    const safeCancelPath = (typeof cancelPath === 'string' && cancelPath.startsWith('/') && !cancelPath.startsWith('//'))
      ? cancelPath
      : '/cenik?cancelled=true'

    const successUrl = `${baseUrl}${safeSuccessPath}`
    const cancelUrl = `${baseUrl}${safeCancelPath}`

    try {
      new URL(successUrl)
      new URL(cancelUrl)
    } catch {
      console.error('[Stripe] Neveljaven URL:', { baseUrl, successUrl, cancelUrl })
      return fail(
        `Napaka konfiguracije URL: baseUrl="${baseUrl}". Nastavite NEXT_PUBLIC_APP_URL=https://liftgo.net v env spremenljivkah.`,
        500
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user?.id ?? undefined,
      customer_email: email ?? user?.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'sl',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      subscription_data: {
        metadata: {
          plan: plan,
          platform: 'liftgo',
          user_id: user?.id ?? '',
        },
      },
    })

    return ok({ url: session.url })

  } catch (err: any) {
    console.error('[Stripe] error:', err.message)
    return fail(err.message || 'Napaka pri Stripe plačilu.', 500)
  }
}

export const POST = withRateLimit(paymentLimiter, postHandler)
