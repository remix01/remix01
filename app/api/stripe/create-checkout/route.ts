import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Robustna funkcija za sestavo URL — nikoli ne vrne "undefined/pot"
function getBaseUrl(req: Request): string {
  // 1. Najprej vzame iz env (najboljša opcija za produkcijo)
  if (process.env.NEXT_PUBLIC_URL) {
    const url = process.env.NEXT_PUBLIC_URL.trim()
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

    if (plan !== 'pro') {
      return NextResponse.json(
        { error: 'START paket ne zahteva plačila.' },
        { status: 400 }
      )
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID
    if (!priceId) {
      console.error('STRIPE_PRO_PRICE_ID ni nastavljen')
      return NextResponse.json(
        { error: 'Konfiguracija plačila manjka. Kontaktirajte info@liftgo.net' },
        { status: 500 }
      )
    }

    // Sestavi base URL robustno
    const baseUrl = getBaseUrl(req)
    console.log('[Stripe] checkout baseUrl:', baseUrl) // Za debugging

    const successUrl = `${baseUrl}/registracija-mojster?plan=pro&stripe=success&session_id={CHECKOUT_SESSION_ID}`
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
      metadata: {
        plan: 'pro',
        platform: 'liftgo',
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[Stripe] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
