import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { getStripePriceId, isValidPlan, type PlanType } from '@/lib/stripe/config'

// Robustna funkcija za sestavo URL — nikoli ne vrne "undefined/pot"
function getBaseUrl(req: Request): string {
  // 1. Najprej vzame iz env (najboljša opcija za produkcijo)
  if (env.NEXT_PUBLIC_URL) {
    const url = env.NEXT_PUBLIC_URL.trim()
    // Zagotovi da ima https://
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace(/\/$/, '') // Odstrani trailing slash
    }
    return 'https://' + url.replace(/\/$/, '')
  }

  // 2. Fallback: vzame iz request headers (deluje na Vercelu)
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`
  }

  // 3. Zadnji fallback — hardkodiran za LiftGO
  return 'https://liftgo.net'
}

export async function POST(req: Request) {
  try {
    const { plan, email } = await req.json()

    // Validacija plana
    if (!isValidPlan(plan)) {
      return NextResponse.json(
        { error: 'Neveljaven paket. Izberite START ali PRO.' },
        { status: 400 }
      )
    }

    // START paket ne zahteva plačila
    if (plan === 'START') {
      return NextResponse.json(
        { error: 'START paket je brezplačan. Registracija ne zahteva Stripe plačila.' },
        { status: 400 }
      )
    }

    // Pridobi price ID iz konfiguracije
    const priceId = getStripePriceId(plan as PlanType)
    if (!priceId) {
      console.error(`[Stripe] Manjka priceId za ${plan}`)
      return NextResponse.json(
        { error: 'Konfiguracija plačila manjka. Kontaktirajte info@liftgo.net' },
        { status: 500 }
      )
    }

    // Sestavi base URL robustno
    const baseUrl = getBaseUrl(req)
    console.log('[Stripe] checkout baseUrl:', baseUrl, 'plan:', plan)

    const successUrl = `${baseUrl}/registracija-mojster?plan=${plan.toLowerCase()}&stripe=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/cenik?cancelled=true`

    // Validacija URL-jev pred Stripe klicem
    try {
      new URL(successUrl)
      new URL(cancelUrl)
    } catch {
      console.error('[Stripe] Neveljaven URL:', { baseUrl, successUrl, cancelUrl })
      return NextResponse.json(
        { error: `Napaka konfiguracije URL: baseUrl="${baseUrl}". Nastavite NEXT_PUBLIC_URL=https://liftgo.net v env spremenljivkah.` },
        { status: 500 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'sl',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      subscription_data: {
        metadata: {
          plan: plan,
          platform: 'liftgo',
        },
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[Stripe] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
