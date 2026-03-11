import { NextRequest, NextResponse } from 'next/server';
import {
  cancelSubscription,
  updateSubscription,
  getSubscriptionDetails
} from '@/lib/stripe/subscriptions';
import { createClient } from '@/lib/supabase/server';
import { type SubscriptionTier } from '@/lib/stripe/products';

// GET - Pridobi podatke o naročnini
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Neavtoriziran dostop' },
        { status: 401 }
      );
    }

    const details = await getSubscriptionDetails(user.id);

    if (!details) {
      return NextResponse.json(
        { error: 'Profil ni najden' },
        { status: 404 }
      );
    }

    return NextResponse.json(details);

  } catch (error) {
    console.error('[API] subscription GET error:', error);
    return NextResponse.json(
      { error: 'Napaka pri pridobivanju podatkov' },
      { status: 500 }
    );
  }
}

// POST - Posodobi naročnino (upgrade/downgrade)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Neavtoriziran dostop' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, tier } = body as {
      action: 'update' | 'cancel';
      tier?: SubscriptionTier;
    };

    if (action === 'cancel') {
      await cancelSubscription(user.id);
      return NextResponse.json({
        success: true,
        message: 'Naročnina bo preklicana ob koncu obdobja'
      });
    }

    if (action === 'update') {
      if (!tier || (tier !== 'start' && tier !== 'pro')) {
        return NextResponse.json(
          { error: 'Neveljaven paket' },
          { status: 400 }
        );
      }

      await updateSubscription(user.id, tier);
      return NextResponse.json({
        success: true,
        message: `Naročnina posodobljena na ${tier.toUpperCase()} paket`
      });
    }

    return NextResponse.json(
      { error: 'Neveljavna akcija' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[API] subscription POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Napaka pri posodobitvi naročnine' },
      { status: 500 }
    );
  }
}