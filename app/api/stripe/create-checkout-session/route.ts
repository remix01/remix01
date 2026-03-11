import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckoutSession } from '@/lib/stripe/subscriptions';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_PRODUCTS, type SubscriptionTier } from '@/lib/stripe/products';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Preveri avtentikacijo
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Neavtoriziran dostop' },
        { status: 401 }
      );
    }

    // Pridobi podatke iz request body
    const body = await request.json();
    const { tier } = body as { tier: SubscriptionTier };

    // Validacija tier-ja
    if (tier !== 'start' && tier !== 'pro') {
      return NextResponse.json(
        { error: 'Neveljaven paket' },
        { status: 400 }
      );
    }

    // START paket je brezplačen - ni potrebna Stripe session
    if (tier === 'start') {
      return NextResponse.json(
        {
          error: 'START paket je brezplačen - ni potrebno plačilo',
          redirect: '/dashboard/narocnina'
        },
        { status: 400 }
      );
    }

    // Pridobi podatke obrtnika
    const { data: profile, error: profileError } = await supabase
      .from('obrtnik_profiles')
      .select('id, business_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profil obrtnika ni najden' },
        { status: 404 }
      );
    }

    // Ustvari success in cancel URL-je
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    const successUrl = `${baseUrl}/dashboard/narocnina?success=true&tier=${tier}`;
    const cancelUrl = `${baseUrl}/dashboard/narocnina?canceled=true`;

    // Ustvari Stripe Checkout Session
    const session = await createSubscriptionCheckoutSession({
      obrtnikId: user.id,
      email: user.email!,
      name: profile.business_name,
      tier,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('[API] create-checkout-session error:', error);
    return NextResponse.json(
      { error: 'Napaka pri ustvarjanju checkout session' },
      { status: 500 }
    );
  }
}