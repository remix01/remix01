# N8N Webhook Configuration Guide

## Overview

This guide covers all webhook endpoints needed to integrate n8n with LiftGO's Next.js application.

---

## Webhook Architecture

### Inbound Webhooks (LiftGO → n8n)
Triggered by LiftGO events, route to n8n workflows.

### Outbound Webhooks (n8n → LiftGO)
Called by n8n workflows to update LiftGO state.

---

## Inbound Webhooks (LiftGO Sends Events to n8n)

### 1. Task Created/Published
**When:** New task published (status changes to 'open')
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/task-published`
**Payload:**
```json
{
  "event": "task.published",
  "taskId": "uuid",
  "customerId": "uuid",
  "categoryId": "string",
  "location": "string",
  "budget": "decimal",
  "title": "string",
  "description": "text",
  "priority": "low|medium|high",
  "publishedAt": "ISO8601"
}
```

**Implementation in LiftGO:**
```typescript
// app/api/tasks/route.ts or in task creation handler
async function publishTask(taskId: string) {
  // ... existing logic
  
  // Send to n8n
  await fetch('https://n8n.liftgo.net/webhook/liftgo/task-published', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'task.published',
      taskId,
      customerId: task.customer_id,
      categoryId: task.category_id,
      location: task.location,
      budget: task.budget,
      title: task.title,
      description: task.description,
      priority: task.priority,
      publishedAt: new Date().toISOString()
    })
  });
}
```

### 2. Task Status Changed
**When:** Task status changes (state machine transition)
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/task-status-changed`
**Payload:**
```json
{
  "event": "task.status_changed",
  "taskId": "uuid",
  "customerId": "uuid",
  "assignedTo": "uuid|null",
  "oldStatus": "draft|open|has_ponudbe|in_progress|completed|cancelled",
  "newStatus": "draft|open|has_ponudbe|in_progress|completed|cancelled",
  "changedAt": "ISO8601"
}
```

### 3. Ponudba (Offer) Created
**When:** Craftsman submits a new offer
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/ponudba-created`
**Payload:**
```json
{
  "event": "ponudba.created",
  "ponudbaId": "uuid",
  "taskId": "uuid",
  "craftmanId": "uuid",
  "customerId": "uuid",
  "price": "decimal",
  "estimatedDays": "integer",
  "description": "text",
  "createdAt": "ISO8601"
}
```

### 4. Payment Completed
**When:** Payment is captured (from Stripe webhook)
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/payment-completed`
**Payload:**
```json
{
  "event": "payment.completed",
  "transactionId": "uuid",
  "taskId": "uuid",
  "amount": "decimal",
  "currency": "EUR",
  "stripeChargeId": "string",
  "status": "succeeded|failed",
  "completedAt": "ISO8601"
}
```

### 5. Dispute Flagged
**When:** User reports a dispute
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/dispute-flagged`
**Payload:**
```json
{
  "event": "dispute.flagged",
  "disputeId": "uuid",
  "taskId": "uuid",
  "reportedBy": "uuid",
  "reason": "quality|payment|communication|other",
  "description": "text",
  "flaggedAt": "ISO8601"
}
```

### 6. Message Sent
**When:** New message in conversations
**Send to:** `POST https://n8n.liftgo.net/webhook/liftgo/message-sent`
**Payload:**
```json
{
  "event": "message.sent",
  "messageId": "uuid",
  "taskId": "uuid|null",
  "senderId": "uuid",
  "recipientId": "uuid",
  "content": "text",
  "sentAt": "ISO8601"
}
```

---

## Outbound Webhooks (n8n Calls LiftGO)

### 1. Notification Sent
**From n8n:** After sending email/push
**Called to:** `POST /api/webhooks/n8n/notification-sent`
**Payload:**
```json
{
  "event": "notification.sent",
  "userId": "uuid",
  "type": "email|push|sms",
  "subject": "string",
  "sentAt": "ISO8601",
  "status": "success|failed",
  "messageId": "string"
}
```

**Implementation in LiftGO:**
```typescript
// app/api/webhooks/n8n/notification-sent/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  
  // Update notification_logs table
  const { error } = await supabase
    .from('notification_logs')
    .insert({
      user_id: data.userId,
      notification_type: data.type,
      status: data.status,
      sent_at: data.sentAt,
      message_id: data.messageId
    });
    
  if (error) {
    console.error('Failed to log notification:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
  
  return Response.json({ success: true });
}
```

### 2. Subscription Updated
**From n8n:** After Stripe subscription change
**Called to:** `POST /api/webhooks/n8n/subscription-updated`
**Payload:**
```json
{
  "event": "subscription.updated",
  "craftmanId": "uuid",
  "previousTier": "START|PRO",
  "newTier": "START|PRO",
  "stripeSubscriptionId": "string",
  "updatedAt": "ISO8601"
}
```

**Implementation in LiftGO:**
```typescript
// app/api/webhooks/n8n/subscription-updated/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  
  // Update obrtnik tier
  const { error } = await supabase
    .from('obrtnik_profiles')
    .update({
      tier: data.newTier,
      stripe_subscription_id: data.stripeSubscriptionId,
      tier_updated_at: new Date().toISOString()
    })
    .eq('id', data.craftmanId);
    
  if (error) {
    console.error('Failed to update subscription:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
  
  // Invalidate cache
  revalidateTag(`craftman-profile-${data.craftmanId}`);
  
  return Response.json({ success: true });
}
```

### 3. AI Usage Logged
**From n8n:** After tracking AI request
**Called to:** `POST /api/webhooks/n8n/ai-usage-log`
**Payload:**
```json
{
  "event": "ai.usage_logged",
  "userId": "uuid",
  "agentType": "work_description|offer_comparison|scheduling_assistant|...",
  "tokensUsed": "integer",
  "costUsd": "decimal",
  "status": "within_limit|warning|blocked",
  "loggedAt": "ISO8601"
}
```

### 4. Escrow Released
**From n8n:** After releasing payment
**Called to:** `POST /api/webhooks/n8n/escrow-released`
**Payload:**
```json
{
  "event": "escrow.released",
  "taskId": "uuid",
  "craftmanId": "uuid",
  "amount": "decimal",
  "platformFee": "decimal",
  "stripeTransferId": "string",
  "releasedAt": "ISO8601"
}
```

### 5. Task Assigned
**From n8n:** After sending matching notifications
**Called to:** `POST /api/webhooks/n8n/task-assigned`
**Payload:**
```json
{
  "event": "task.assigned",
  "taskId": "uuid",
  "craftmanId": "uuid",
  "notificationType": "email|push|both",
  "assignedAt": "ISO8601"
}
```

---

## Integration Checklist

### Client-Side Implementation
- [ ] Create webhook service in `lib/webhooks/`
- [ ] Add error handling and retry logic
- [ ] Implement request signing/verification
- [ ] Add request logging

### Server-Side Implementation
- [ ] Create webhook routes in `app/api/webhooks/n8n/`
- [ ] Verify webhook signatures
- [ ] Handle idempotency (prevent duplicate processing)
- [ ] Add audit logging
- [ ] Implement exponential backoff for retries

### N8N Configuration
- [ ] Set up Supabase connection
- [ ] Set up Resend connection
- [ ] Set up Stripe connection
- [ ] Set up Slack connection (admin alerts)
- [ ] Register webhook URLs in n8n

### Monitoring & Alerts
- [ ] Set up error logging in Sentry
- [ ] Configure Slack alerts for webhook failures
- [ ] Monitor n8n execution logs
- [ ] Track webhook latency

---

## Webhook Security

### Signature Verification
Each webhook should be signed with a secret. Implement verification:

```typescript
// lib/webhooks/verify.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${hash}`)
  );
}
```

### Rate Limiting
Implement rate limiting on webhook endpoints:
```typescript
// Use next-rate-limit or similar
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return Response.json({ error: 'Rate limited' }, { status: 429 });
  }
  // ... handle webhook
}
```

---

## Deployment Workflow

### 1. N8N Setup (First Time)
```bash
# Login to n8n instance
# 1. Configure all connections (Supabase, Stripe, Resend, etc.)
# 2. Import workflow JSON files from docs/n8n-workflows/
# 3. Test each workflow in test mode
# 4. Enable workflows one by one
```

### 2. LiftGO Integration
```bash
# Add webhook routes
# Add webhook client in lib/webhooks/
# Update .env with n8n webhook URLs
# Deploy to Vercel
```

### 3. Testing
```bash
# 1. Trigger test events manually
# 2. Verify n8n executions
# 3. Check LiftGO webhook logs
# 4. Confirm database updates
```

---

## Troubleshooting

### Webhook Not Triggering
1. Check n8n workflow is active
2. Verify webhook URL is correct
3. Check LiftGO logs for request errors
4. Verify network connectivity

### Data Not Updated
1. Check webhook payload format
2. Verify database permissions (RLS)
3. Check n8n error logs
4. Verify webhook signature (if implemented)

### Performance Issues
1. Check n8n execution time
2. Optimize Supabase queries
3. Implement async processing with QStash
4. Monitor webhook latency

---

## Related Files
- [N8N_AUTOMATION_SETUP.md](./N8N_AUTOMATION_SETUP.md)
- [CLAUDE.md](../CLAUDE.md)
