/**
 * Stripe Subscription Management
 * 
 * Pomožne funkcije za upravljanje naročnin obrtnikov.
 */

import Stripe from 'stripe';
import { stripe } from './stripe';
import { getPriceId, type SubscriptionTier } from './stripe/products';
import { supabaseAdmin } from './supabase-admin';

/**
 * Ustvari ali pridobi Stripe Customer ID za obrtnika
 */
export async function getOrCreateStripeCustomer(
  obrtnikId: string,
  email: string,
  name: string
): Promise<string> {
  // Preveri če že obstaja
  const { data: profile } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('stripe_customer_id')
    .eq('id', obrtnikId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Ustvari novega Stripe customera
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      obrtnik_id: obrtnikId,
    },
  });

  // Shrani customer ID v bazo
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', obrtnikId);

  return customer.id;
}

/**
 * Ustvari Stripe Checkout Session za naročnino
 */
export async function createSubscriptionCheckoutSession(params: {
  obrtnikId: string;
  email: string;
  name: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { obrtnikId, email, name, tier, successUrl, cancelUrl } = params;

  // Pridobi ali ustvari Stripe customera
  const customerId = await getOrCreateStripeCustomer(obrtnikId, email, name);

  // Pridobi price ID za izbrani plan
  const priceId = getPriceId(tier);

  // Ustvari Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      obrtnik_id: obrtnikId,
      tier,
    },
  });

  return session;
}

/**
 * Prekliči naročnino obrtnika
 */
export async function cancelSubscription(obrtnikId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('stripe_subscription_id')
    .eq('id', obrtnikId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error('Obrtnik nima aktivne naročnine');
  }

  // Prekliči subscription ob koncu billing perioda
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
}

/**
 * Nadgradi ali prenesi naročnino
 */
export async function updateSubscription(
  obrtnikId: string,
  newTier: SubscriptionTier
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('stripe_subscription_id, subscription_tier')
    .eq('id', obrtnikId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error('Obrtnik nima aktivne naročnine');
  }

  if (profile.subscription_tier === newTier) {
    throw new Error('Obrtnik že uporablja ta paket');
  }

  // Pridobi novo price ID
  const newPriceId = getPriceId(newTier);

  // Pridobi trenutni subscription
  const subscription = await stripe.subscriptions.retrieve(
    profile.stripe_subscription_id
  );

  // Posodobi subscription item
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice', // Zaračunaj razliko takoj
  });

  // Posodobi tier v bazi (webhook bo to tudi posodobil, ampak za vsak slučaj)
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ subscription_tier: newTier })
    .eq('id', obrtnikId);
}

/**
 * Pridobi podatke o trenutni naročnini
 */
export async function getSubscriptionDetails(
  obrtnikId: string
): Promise<{
  tier: SubscriptionTier;
  status: Stripe.Subscription.Status | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null> {
  const { data: profile } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('stripe_subscription_id, subscription_tier')
    .eq('id', obrtnikId)
    .single();

  if (!profile) {
    return null;
  }

  // Če nima subscription ID, je na FREE planu
  if (!profile.stripe_subscription_id) {
    return {
      tier: profile.subscription_tier as SubscriptionTier,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  // Pridobi podatke iz Stripe
  const subscription = await stripe.subscriptions.retrieve(
    profile.stripe_subscription_id
  );

  return {
    tier: profile.subscription_tier as SubscriptionTier,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}