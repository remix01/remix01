/**
 * Webhook: N8N → LiftGO
 * Event: notification.sent
 *
 * Logs when n8n successfully sends a notification
 */

import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/webhooks/n8n-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationSentPayload {
  event: 'notification.sent';
  userId: string;
  type: 'email' | 'push' | 'sms';
  subject?: string;
  sentAt: string;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-webhook-signature');

    // Verify signature if configured
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

    const data: NotificationSentPayload = JSON.parse(bodyText);

    // Validate required fields
    if (!data.userId || !data.type || !data.sentAt) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into notification_logs
    const { error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: data.userId,
        notification_type: data.type,
        status: data.status,
        sent_at: new Date(data.sentAt).toISOString(),
        subject: data.subject || null,
        message_id: data.messageId || null,
        error: data.error || null,
      });

    if (error) {
      console.error('Failed to insert notification log:', error);
      return Response.json(
        { error: 'Failed to log notification' },
        { status: 500 }
      );
    }

    // If failed, alert admin
    if (data.status === 'failed') {
      console.warn(
        `Notification failed for user ${data.userId}: ${data.error}`
      );

      // TODO: Send Slack alert if critical
      // await slack.send({
      //   channel: '#alerts',
      //   text: `⚠️ Notification failed for user ${data.userId}`,
      //   blocks: [...]
      // });
    }

    return Response.json(
      { success: true, logged: true },
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

// Health check
export async function GET() {
  return Response.json(
    { status: 'ok', endpoint: 'notification-sent' },
    { status: 200 }
  );
}
