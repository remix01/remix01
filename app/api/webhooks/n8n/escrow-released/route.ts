/**
 * Webhook: N8N → LiftGO
 * Event: escrow.released
 *
 * Updates task and transaction records when escrow is released
 */

import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { verifyWebhookSignature } from '@/lib/webhooks/n8n-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EscrowReleasedPayload {
  event: 'escrow.released';
  taskId: string;
  craftmanId: string;
  transactionId?: string;
  amount: number;
  platformFee: number;
  stripeTransferId: string;
  releasedAt: string;
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

    const data: EscrowReleasedPayload = JSON.parse(bodyText);

    // Validate required fields
    if (!data.taskId || !data.craftmanId || !data.stripeTransferId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const releasedAt = new Date(data.releasedAt).toISOString();

    // Update task payment status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        payment_status: 'released',
        released_at: releasedAt,
      })
      .eq('id', data.taskId);

    if (taskError) {
      console.error('Failed to update task:', taskError);
      return Response.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Update transaction record
    if (data.transactionId) {
      const { error: transError } = await supabase
        .from('transactions')
        .update({
          status: 'released',
          released_at: releasedAt,
          stripe_transfer_id: data.stripeTransferId,
          platform_fee: data.platformFee,
        })
        .eq('id', data.transactionId);

      if (transError) {
        console.error('Failed to update transaction:', transError);
        // Don't fail the whole request if transaction update fails
      }
    }

    // Log to audit trail
    await supabase
      .from('audit_logs')
      .insert({
        action: 'escrow_released',
        task_id: data.taskId,
        craftsman_id: data.craftmanId,
        amount: data.amount,
        platform_fee: data.platformFee,
        stripe_transfer_id: data.stripeTransferId,
        created_at: new Date().toISOString(),
      });

    // Create earnings record for craftsman
    await supabase
      .from('craftsman_earnings')
      .insert({
        craftsman_id: data.craftmanId,
        task_id: data.taskId,
        gross_amount: data.amount,
        platform_fee: data.platformFee,
        net_amount: data.amount - data.platformFee,
        type: 'escrow_release',
        stripe_transfer_id: data.stripeTransferId,
        released_at: releasedAt,
      });

    // Invalidate relevant caches
    revalidateTag(`task-${data.taskId}`);
    revalidateTag(`craftman-earnings-${data.craftmanId}`);

    return Response.json(
      { success: true, released: true },
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
    { status: 'ok', endpoint: 'escrow-released' },
    { status: 200 }
  );
}
