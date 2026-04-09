/**
 * Webhook: N8N → LiftGO
 * Event: subscription.updated
 *
 * Updates craftsman tier when subscription changes in Stripe
 */

import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { verifyWebhookSignature } from '@/lib/webhooks/n8n-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SubscriptionUpdatedPayload {
  event: 'subscription.updated';
  craftmanId: string;
  previousTier: 'START' | 'PRO';
  newTier: 'START' | 'PRO';
  stripeSubscriptionId: string;
  updatedAt: string;
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-webhook-signature');

    // Verify signature
    if (signature && process.env.N8N_WEBHOOK_SECRET) {
      const verified = verifyWebhookSignature(
        bodyText,
        signature,
        process.env.N8N_WEBHOOK_SECRET
      );

      if (!verified) {
        console.warn('Invalid webhook signature');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data: SubscriptionUpdatedPayload = JSON.parse(bodyText);

    // Validate required fields
    if (!data.craftmanId || !data.newTier || !data.stripeSubscriptionId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update obrtnik tier
    const { error: updateError } = await supabase
      .from('obrtnik_profiles')
      .update({
        tier: data.newTier,
        stripe_subscription_id: data.stripeSubscriptionId,
        tier_updated_at: new Date(data.updatedAt).toISOString(),
      })
      .eq('id', data.craftmanId);

    if (updateError) {
      console.error('Failed to update tier:', updateError);
      return Response.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        action: 'tier_updated_via_webhook',
        craftsman_id: data.craftmanId,
        previous_tier: data.previousTier,
        new_tier: data.newTier,
        stripe_subscription_id: data.stripeSubscriptionId,
        created_at: new Date().toISOString(),
      });

    // Invalidate cache
    revalidateTag(`craftman-profile-${data.craftmanId}`);
    revalidateTag('craftman-profiles');

    return Response.json(
      { success: true, updated: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { status: 'ok', endpoint: 'subscription-updated' },
    { status: 200 }
  );
}
