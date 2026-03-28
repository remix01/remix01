import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

function getBaseUrl(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://liftgo.net'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stripe_customer_id from obrtnik_profiles
    const { data: profile } = await supabase
      .from('obrtnik_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    const customerId = profile?.stripe_customer_id

    if (!customerId) {
      return NextResponse.json(
        { error: 'Stripe customer ni najden. Najprej aktivirajte naročnino.' },
        { status: 404 }
      )
    }

    const returnUrl = `${getBaseUrl(req)}/obrtnik/narocnina`

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('[Stripe Portal] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
