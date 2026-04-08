import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { env } from '@/lib/env'

function getBaseUrl(req: Request): string {
  if (env.NEXT_PUBLIC_APP_URL) {
    const url = env.NEXT_PUBLIC_APP_URL.trim()
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace(/\/$/, '')
    }
    return `https://${url.replace(/\/$/, '')}`
  }

  const host = req.headers.get('host') || req.headers.get('x-forwarded-host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`
  }

  return 'https://liftgo.net'
}

function sanitizePath(path?: string, fallback = '/partner-dashboard/account/narocnina'): string {
  if (!path || typeof path !== 'string') return fallback
  if (!path.startsWith('/')) return fallback
  if (path.startsWith('//')) return fallback
  return path
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const returnPath = sanitizePath(body?.returnPath)
    const baseUrl = getBaseUrl(req)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[Stripe portal] profile fetch error:', profileError)
      return NextResponse.json({ error: 'Napaka pri branju profila.' }, { status: 500 })
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer ne obstaja za ta račun. Najprej aktivirajte PRO naročnino.' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}${returnPath}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe portal] error:', err.message)
    return NextResponse.json({ error: err.message || 'Napaka pri odpiranju Stripe portala.' }, { status: 500 })
  }
}
