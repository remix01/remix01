# N8N Integration Quick Reference

## For Developers

### Sending an Event to n8n

```typescript
import { sendWebhookEvent } from '@/lib/webhooks/n8n-client';

// When task is published
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
}).catch(error => console.error('Webhook failed:', error));
```

### Available Events

| Event | When | Required Fields |
|-------|------|-----------------|
| `task.published` | New task posted | taskId, customerId, categoryId |
| `task.status_changed` | Status changes | taskId, oldStatus, newStatus |
| `ponudba.created` | Offer submitted | ponudbaId, taskId, craftmanId, price |
| `payment.completed` | Payment captured | transactionId, taskId, amount |
| `dispute.flagged` | Dispute reported | disputeId, taskId, reportedBy, reason |
| `message.sent` | New message | messageId, senderId, recipientId |

### Webhook Endpoints (n8n → LiftGO)

All are POST endpoints at `https://liftgo.net/api/webhooks/n8n/`:

- `/notification-sent` - Log sent notifications
- `/subscription-updated` - Update craftsman tier
- `/escrow-released` - Release payment
- `/task-assigned` - Log assignment

---

## For DevOps / Deployment

### Prerequisites
```bash
# n8n instance running
# Supabase configured
# Stripe connected
# Resend API key ready
# Slack workspace (optional but recommended)
```

### Environment Variables (.env)
```env
N8N_WEBHOOK_BASE=https://n8n.liftgo.net/webhook
N8N_WEBHOOK_SECRET=<32-char-secret>
UPSTASH_REDIS_REST_URL=<if using queue>
UPSTASH_REDIS_REST_TOKEN=<if using queue>
```

### Health Checks

**Test webhook URL:**
```bash
curl -X GET https://n8n.liftgo.net/webhook/status
```

**Test LiftGO endpoints:**
```bash
curl -X GET https://liftgo.net/api/webhooks/n8n/notification-sent
curl -X GET https://liftgo.net/api/webhooks/n8n/subscription-updated
curl -X GET https://liftgo.net/api/webhooks/n8n/escrow-released
```

### Monitoring

**Check n8n executions:**
```bash
# Login to n8n UI → Workflows → Click workflow
# View execution history and error messages
```

**Check LiftGO logs:**
```bash
# Vercel: CLI or dashboard
vercel logs production

# Or direct: Check Sentry for errors
# https://sentry.io → LiftGO project
```

**Database audit:**
```sql
-- Check recent webhook activity
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 20;
SELECT * FROM audit_logs WHERE action LIKE '%webhook%' LIMIT 20;
```

---

## For Support / Debugging

### Is the webhook being received?

1. Check n8n **Webhook History**:
   - Go to n8n workflow
   - Open **Webhook** node
   - Click "Clear History" or view requests

2. Check LiftGO logs:
   ```bash
   # Check server logs
   tail -f /var/log/liftgo.log | grep webhook
   
   # Or Vercel logs
   vercel logs production --follow
   ```

### Is the data correct?

1. Check webhook payload:
   - Look at n8n execution details
   - Verify all required fields are present
   - Check data types match expected

2. Check database:
   ```sql
   SELECT * FROM notification_logs WHERE user_id = 'xxx';
   SELECT * FROM audit_logs WHERE task_id = 'xxx';
   ```

### Is the response correct?

1. n8n should receive 200 OK from LiftGO
2. Response body: `{"success": true}`
3. If 4xx: Webhook signature invalid or missing fields
4. If 5xx: Database error, check Sentry logs

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Bad signature | Check N8N_WEBHOOK_SECRET matches |
| 400 Bad Request | Missing fields | Verify payload structure |
| 500 Server Error | Database error | Check RLS policies, check logs |
| Timeout | n8n not responding | Check n8n instance status |
| No event received | Webhook not triggered | Verify trigger condition in code |

---

## Performance Notes

### Webhook Timing
- Average latency: 100-500ms per webhook
- Max: 5 seconds before timeout
- Retries: 3 times with exponential backoff

### Rate Limits
- 100 webhooks/minute per webhook URL
- Queued if limit exceeded
- Queue processes every 30 seconds

### Best Practices
1. ✓ Always `.catch()` webhook calls (don't block on failure)
2. ✓ Log errors to database or Sentry
3. ✓ Queue for retry if critical
4. ✓ Monitor error rates in dashboard
5. ✓ Test in staging before production

---

## Workflow Files

Location: `docs/n8n-workflows/`

| File | Purpose | Status |
|------|---------|--------|
| `01-task-status-notifications.json` | Email/push on status change | ✓ Ready |
| `02-matching-tasks-assignment.json` | Notify craftsmen of new tasks | ✓ Ready |
| `03-escrow-auto-release.json` | Auto-release payment after 7 days | ✓ Ready |

---

## Documentation Links

- [Full Setup Guide](./N8N_IMPLEMENTATION_GUIDE.md)
- [Automation Overview](./N8N_AUTOMATION_SETUP.md)
- [Webhook Configuration](./N8N_WEBHOOK_CONFIGURATION.md)
- [Webhook Client Docs](../lib/webhooks/n8n-client.ts)
- [N8N Official Docs](https://docs.n8n.io/)

---

## Quick Commands

```bash
# View all webhook events sent (from LiftGO)
grep -r "sendWebhookEvent" app/ lib/ --include="*.ts"

# Check webhook handlers
ls -la app/api/webhooks/n8n/

# Test webhook manually
curl -X POST https://liftgo.net/api/webhooks/n8n/notification-sent \
  -H "Content-Type: application/json" \
  -d '{"event":"notification.sent","userId":"test","type":"email","status":"success","sentAt":"2026-04-09T10:00:00Z"}'

# Check n8n instance
curl https://n8n.liftgo.net/api/v1/me -H "Authorization: Bearer YOUR_API_KEY"
```

---

**Last Updated:** April 9, 2026  
**Status:** Ready for Implementation
