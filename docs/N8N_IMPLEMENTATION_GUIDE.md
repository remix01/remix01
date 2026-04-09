# N8N Implementation Guide for LiftGO

## Quick Start (5 minutes)

### 1. Setup n8n Instance
```bash
# Option A: SaaS (Recommended for production)
# Go to https://app.n8n.cloud and create account

# Option B: Self-hosted
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  --env N8N_HOST=n8n.liftgo.net \
  --env N8N_PROTOCOL=https \
  n8nio/n8n
```

### 2. Configure Connections
In n8n UI:
1. **Credentials** → Create New Credential
2. Add the following connections:

#### Supabase
- Type: `Postgres`
- Host: `db.whabaeatixtymbccwigu.supabase.co`
- Database: `postgres`
- Username: `postgres`
- Password: (from Supabase dashboard)
- SSL: Enabled
- Port: 5432

#### Stripe
- Type: `Stripe`
- Secret Key: (from Stripe dashboard)
- Keep private

#### Resend
- Type: `HTTP Request` (use for custom integrations)
- Base URL: `https://api.resend.com`
- API Key: (from Resend dashboard)

#### Slack (Admin Alerts)
- Type: `Slack`
- OAuth Token: (from Slack workspace settings)
- Channel: `#alerts` or your preference

### 3. Import Workflows
In n8n:
1. **Workflows** → Import Workflow
2. Upload JSON files from `docs/n8n-workflows/`
   - `01-task-status-notifications.json`
   - `02-matching-tasks-assignment.json`
   - `03-escrow-auto-release.json`

### 4. Configure Environment Variables

#### n8n Side
```env
# In n8n settings
N8N_HOST=n8n.liftgo.net
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://n8n.liftgo.net/webhook
```

#### LiftGO Side (.env)
```env
# Webhook communication
N8N_WEBHOOK_BASE=https://n8n.liftgo.net/webhook
N8N_WEBHOOK_SECRET=your-shared-secret-32-chars-min

# Optional: For rate limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### 5. Enable Workflows
In n8n UI:
1. Open each workflow
2. Click **Activate** (top right)
3. **Test** with sample data first
4. Monitor **Executions** tab

---

## Integration Points

### From LiftGO to n8n

#### When Task is Published
**File:** `app/api/tasks/[id]/publish/route.ts` (or where tasks are published)
```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

export async function POST(req: Request) {
  // ... existing task creation logic
  
  // Send to n8n
  await sendWebhookEvent({
    event: 'task.published',
    taskId: task.id,
    customerId: task.customer_id,
    categoryId: task.category_id,
    location: task.location,
    budget: task.budget,
    title: task.title,
    description: task.description,
    priority: task.priority,
    publishedAt: new Date().toISOString(),
  }).catch(error => {
    console.error('Failed to send webhook:', error);
    // Don't fail the request, just log the error
  });
  
  return Response.json({ success: true });
}
```

#### When Task Status Changes
**File:** `lib/guards/state-machine-guard.ts` (after state transition)
```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

export async function transitionTask(
  taskId: string,
  oldStatus: string,
  newStatus: string
) {
  // ... existing state machine logic
  
  // Send webhook after successful state change
  await sendWebhookEvent({
    event: 'task.status_changed',
    taskId,
    customerId: task.customer_id,
    assignedTo: task.assigned_to,
    oldStatus,
    newStatus,
    changedAt: new Date().toISOString(),
  }).catch(error => console.error('Webhook failed:', error));
}
```

#### When Ponudba is Created
**File:** `app/api/ponudbe/route.ts`
```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

// After inserting ponudba to database
await sendWebhookEvent({
  event: 'ponudba.created',
  ponudbaId: ponudba.id,
  taskId: ponudba.task_id,
  craftmanId: ponudba.craftsman_id,
  customerId: task.customer_id,
  price: ponudba.price,
  estimatedDays: ponudba.estimated_days,
  description: ponudba.description,
  createdAt: new Date().toISOString(),
});
```

#### When Payment Completes
**File:** `app/api/payments/webhook/route.ts` (Stripe webhook handler)
```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

if (event.type === 'charge.succeeded') {
  await sendWebhookEvent({
    event: 'payment.completed',
    transactionId: transaction.id,
    taskId: transaction.task_id,
    amount: charge.amount / 100,
    currency: 'EUR',
    stripeChargeId: charge.id,
    status: 'succeeded',
    completedAt: new Date().toISOString(),
  });
}
```

#### When Dispute is Flagged
**File:** `app/api/disputes/route.ts`
```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

await sendWebhookEvent({
  event: 'dispute.flagged',
  disputeId: dispute.id,
  taskId: dispute.task_id,
  reportedBy: dispute.reported_by,
  reason: dispute.reason,
  description: dispute.description,
  flaggedAt: new Date().toISOString(),
});
```

---

## From n8n to LiftGO

All webhook endpoints are in `app/api/webhooks/n8n/`:

### Available Endpoints

| Endpoint | Event | Purpose |
|----------|-------|---------|
| `/notification-sent` | notification.sent | Log sent notifications |
| `/subscription-updated` | subscription.updated | Update craftsman tier |
| `/escrow-released` | escrow.released | Release payment to craftsman |
| `/task-assigned` | task.assigned | Log task assignment |
| `/ai-usage-log` | ai.usage_logged | Track AI usage |

### Example n8n Workflow Node
```json
{
  "name": "Send to LiftGO",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://liftgo.net/api/webhooks/n8n/notification-sent",
    "headers": {
      "Content-Type": "application/json",
      "X-Webhook-Signature": "{{ signature }}"
    },
    "body": {
      "event": "notification.sent",
      "userId": "{{ userId }}",
      "type": "email",
      "sentAt": "{{ $now.toISOString() }}",
      "status": "success"
    }
  }
}
```

---

## Testing

### 1. Test Webhook Send (from LiftGO)
```bash
# Using curl
curl -X POST https://n8n.liftgo.net/webhook/liftgo/task-published \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task.published",
    "taskId": "test-123",
    "customerId": "cust-456",
    "categoryId": "cat-789",
    "location": "Ljubljana",
    "budget": 100,
    "title": "Test Task",
    "description": "Test",
    "priority": "high",
    "publishedAt": "2026-04-09T10:00:00Z"
  }'

# Or using Node.js
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

await sendWebhookEvent({
  event: 'task.published',
  taskId: 'test-123',
  // ... other fields
});
```

### 2. Test Webhook Receive (from n8n)
```bash
# Create test endpoint in LiftGO
curl -X POST http://localhost:3000/api/webhooks/n8n/notification-sent \
  -H "Content-Type: application/json" \
  -d '{
    "event": "notification.sent",
    "userId": "user-123",
    "type": "email",
    "status": "success",
    "sentAt": "2026-04-09T10:00:00Z"
  }'
```

### 3. n8n Test Mode
1. Open workflow
2. Click **Test** (or use Debug panel)
3. Click **Fetch Webhook History** to see recent calls
4. Use **Execution History** to debug

### 4. Verify Database Updates
```sql
-- Check notification logs
SELECT * FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check audit trail
SELECT * FROM audit_logs 
WHERE action LIKE '%webhook%'
ORDER BY created_at DESC;

-- Check escrow releases
SELECT * FROM tasks 
WHERE payment_status = 'released'
ORDER BY released_at DESC;
```

---

## Monitoring & Debugging

### N8N Monitoring
1. **Executions** tab → View all workflow runs
2. **Error handling** → See failed executions
3. **Logs** → Check detailed error messages
4. **Webhooks** → View all webhook requests

### LiftGO Monitoring
1. **Error Logs** → Check `/api/webhooks/n8n/*` errors in Sentry
2. **Database** → Query `notification_logs` and `audit_logs`
3. **API Logs** → Check Next.js server logs

### Common Issues

#### Webhook Not Triggering
1. ✓ Is n8n workflow **activated**?
2. ✓ Is webhook URL **correct**?
3. ✓ Check n8n **Webhook History**
4. ✓ Check LiftGO **error logs**

#### Data Not Updating
1. ✓ Check **webhook payload format**
2. ✓ Verify **database permissions** (RLS)
3. ✓ Check **n8n execution logs**
4. ✓ Verify **Supabase connection** in n8n

#### Signature Verification Failing
1. ✓ Verify `N8N_WEBHOOK_SECRET` matches on both sides
2. ✓ Check signature is being sent in headers
3. ✓ Verify header name: `X-Webhook-Signature`

---

## Deployment Checklist

### Pre-Production
- [ ] n8n instance set up and accessible
- [ ] All connections configured (Supabase, Stripe, Resend)
- [ ] Workflows imported and tested
- [ ] Webhook endpoints created in LiftGO
- [ ] Environment variables configured
- [ ] Signature verification enabled
- [ ] Rate limiting configured
- [ ] Error handling tested

### Production
- [ ] n8n running on production domain
- [ ] TLS/HTTPS enabled
- [ ] Monitoring and alerts configured
- [ ] Slack alerts to #alerts channel
- [ ] Database backups enabled
- [ ] Audit logging enabled
- [ ] Rate limits tuned for production load
- [ ] Webhook retry policies tested

### Rollback Plan
1. Disable workflows in n8n UI
2. Keep manual fallback process active
3. Use QStash job queue for failed webhooks
4. Monitor error logs for issues

---

## Security Considerations

### 1. Webhook Signature Verification
Already implemented in `lib/webhooks/n8n-client.ts`:
```typescript
// Automatic signature verification in POST handlers
if (signature && process.env.N8N_WEBHOOK_SECRET) {
  const verified = verifyWebhookSignature(bodyText, signature, secret);
  if (!verified) return 401;
}
```

### 2. HTTPS Only
- All webhooks use HTTPS
- Configure TLS certificates for n8n domain
- Enforce HTTPS in Next.js

### 3. Secrets Management
- Store `N8N_WEBHOOK_SECRET` in `.env.local` (never git)
- Use Vercel secrets for production
- Rotate credentials regularly

### 4. Rate Limiting
- Implemented via Upstash Redis
- 100 requests per minute per webhook
- Failed requests queued for retry

---

## Cost Estimation

### N8N
- **Cloud**: $20-200/month depending on execution count
- **Self-hosted**: Server costs only

### Supabase
- Included with LiftGO setup
- No additional cost for webhooks

### Resend
- $0.20 per 1000 emails
- Based on actual emails sent

### Upstash (QStash + Redis)
- Free tier: 100K messages/month
- Paid: $0.35 per 1M messages

---

## Next Steps

1. Set up n8n instance
2. Configure connections
3. Import workflows
4. Add webhook calls to LiftGO code
5. Create webhook receive endpoints
6. Test end-to-end
7. Deploy to production
8. Monitor and adjust

---

## Support & Documentation
- [N8N Docs](https://docs.n8n.io/)
- [N8N Automation Setup](./N8N_AUTOMATION_SETUP.md)
- [Webhook Configuration](./N8N_WEBHOOK_CONFIGURATION.md)
- [LiftGO CLAUDE.md](../CLAUDE.md)
