# N8N Automation Setup for LiftGO

**Last Updated:** April 9, 2026

## Overview

This document describes the n8n automation workflows needed to connect LiftGO's core business processes with external systems and internal notifications.

## Quick Setup IDs
- **n8n Webhook Base:** `https://n8n.liftgo.net/webhook`
- **Supabase Project:** `whabaeatixtymbccwigu`
- **Stripe Account:** `prod_U7z9Ymkbh2zRAW` (START) | `prod_SpS7ixowByASns` (PRO)
- **Upstash QStash:** For job queue integration

---

## Automation Domains

### 1. **Naročnik (Customer) Workflows**

#### Workflow 1.1: New Task Created
**Trigger:** Task created in `tasks` table
**Flow:**
```
Supabase (task.created) 
  → Extract category, location, budget
  → Find matching obrtniki (via RLS query)
  → Generate email notifications
  → Send push notifications
  → Log to ai_usage_logs
```

**n8n Nodes:**
- Supabase Trigger (listen to `tasks` table INSERT)
- Query Supabase RLS view for matching profiles
- Email connector (Resend)
- Push notification service
- Database logger

#### Workflow 1.2: Task Status Update Notifications
**Trigger:** Task status changes (draft → open → has_ponudbe → in_progress → completed)
**Flow:**
```
Task Status Change
  → Get customer profile
  → Select message template based on status
  → Send email + push notification
  → Update notification_queue table
```

**n8n Nodes:**
- Database trigger (tasks.status change)
- Conditional branching (status type)
- Email/SMS sender
- Push notification queue

#### Workflow 1.3: New Ponudbe Notification
**Trigger:** New `ponudbe` inserted
**Flow:**
```
New Ponudba
  → Fetch customer preferences
  → Format offer details
  → Send immediate notification
  → Mark as notified in database
```

**n8n Nodes:**
- Supabase trigger on `ponudbe`
- Data formatter
- Email + Push notification
- Status update

### 2. **Obrtnik (Craftsman) Workflows**

#### Workflow 2.1: Matching Tasks Assignment
**Trigger:** New task published with category/location
**Flow:**
```
New Task Published
  → Query obrtniki by service_categories + location
  → Filter by rating > 4.0 (optional tier gate)
  → Check daily task quota (START: 10, PRO: unlimited)
  → Send notification batches (max 20 per craftsman/day)
  → Log to notification_queue
```

**n8n Nodes:**
- Task trigger (status = 'open')
- Supabase query (obrtnik_profiles with service match)
- Rate limiter node
- Batch email sender
- Logging

#### Workflow 2.2: Subscription Management
**Trigger:** Stripe customer.subscription.updated
**Flow:**
```
Subscription Event
  → Parse Stripe webhook
  → Update obrtnik_profiles tier
  → Enable/disable AI features
  → Send tier upgrade email
  → Log event
```

**n8n Nodes:**
- Stripe webhook trigger
- JSON parser
- Supabase update (obrtnik tier)
- Feature flag setter
- Email confirmation

#### Workflow 2.3: Payment Confirmation & Earnings
**Trigger:** Payment processed in Stripe
**Flow:**
```
Payment Confirmed
  → Calculate platform commission (10% for START, 5% for PRO)
  → Log transaction
  → Queue escrow release (auto-release in 7 days)
  → Send earning notification
```

**n8n Nodes:**
- Stripe charge.succeeded trigger
- Math node (commission calculation)
- Supabase insert to transaction_logs
- Scheduled task creator (escrow release)
- Email notification

### 3. **System Workflows**

#### Workflow 3.1: Dispute Resolution Flow
**Trigger:** Dispute flagged
**Flow:**
```
Dispute Reported
  → Fetch task + payment details
  → Notify both parties
  → Alert admin
  → Set SLA (24hr response)
  → Create resolution ticket
```

**n8n Nodes:**
- Supabase disputes trigger
- Multi-path email sender (customer + craftsman + admin)
- Slack alert for admin
- Ticket creation

#### Workflow 3.2: AI Usage Tracking & Billing
**Trigger:** Agent API call completed
**Flow:**
```
AI Agent Request
  → Log to ai_usage_logs
  → Calculate daily cost
  → Check if over limit (START: 10/day)
  → Warn or block if needed
  → Monthly billing aggregation
```

**n8n Nodes:**
- HTTP trigger (from app middleware)
- Data logger
- Threshold check
- Cost calculator
- Email notification

#### Workflow 3.3: Escrow Auto-Release
**Trigger:** 7 days after task completion
**Flow:**
```
Task Completed 7 Days Ago
  → Verify no disputes
  → Release escrow to obrtnik
  → Update payment status
  → Send confirmation email
  → Log to audit_logs
```

**n8n Nodes:**
- Cron schedule (daily check)
- Supabase query (completed > 7 days)
- Conditional (check disputes)
- Stripe payout trigger
- Email notification

#### Workflow 3.4: Message Notifications
**Trigger:** New message in `sporocila` table
**Flow:**
```
New Message
  → Check recipient notification preferences
  → Send email + push notification
  → Update unread count
  → Mark notification as sent
```

**n8n Nodes:**
- Supabase trigger on `sporocila`
- Preference lookup
- Email + Push sender
- Status updater

---

## Webhook Endpoints Required

All webhook endpoints should be created in n8n and point back to the app for status updates:

### Supabase → n8n Webhooks
```
POST /api/webhooks/n8n/task-created
POST /api/webhooks/n8n/task-status-changed
POST /api/webhooks/n8n/ponudba-created
POST /api/webhooks/n8n/payment-completed
POST /api/webhooks/n8n/dispute-flagged
```

### n8n → LiftGO Webhooks
```
POST /api/webhooks/n8n/ai-usage-log
POST /api/webhooks/n8n/notification-sent
POST /api/webhooks/n8n/subscription-updated
POST /api/webhooks/n8n/escrow-released
```

---

## Connections to Configure in n8n

| Service | Auth Type | Config |
|---------|-----------|--------|
| **Supabase** | API Key | Project: `whabaeatixtymbccwigu`, Key: service_role |
| **Stripe** | API Key | Secret key from dashboard |
| **Resend** | API Key | Email service |
| **Slack** | OAuth | Admin alerts channel |
| **Twilio** | Account SID + Token | SMS notifications (optional) |
| **PostgreSQL** | Connection String | Direct DB access for complex queries |

---

## Workflow Implementation Priority

### Phase 1 (MVP - Week 1)
1. Workflow 1.2 - Task Status Notifications (basic, manual trigger)
2. Workflow 2.1 - Matching Tasks Assignment (via webhook)
3. Workflow 3.3 - Escrow Auto-Release (via cron)

### Phase 2 (Week 2-3)
1. Workflow 1.1 - New Task Created
2. Workflow 1.3 - New Ponudbe Notification
3. Workflow 2.2 - Subscription Management

### Phase 3 (Week 4)
1. Workflow 2.3 - Payment Confirmation & Earnings
2. Workflow 3.1 - Dispute Resolution Flow
3. Workflow 3.2 - AI Usage Tracking & Billing
4. Workflow 3.4 - Message Notifications

---

## Testing Strategy

### Local Testing
1. Use n8n test mode with mock data
2. Test webhook payloads with curl/Postman
3. Verify database updates with Supabase Studio

### Production Testing
1. Enable workflows one at a time
2. Monitor error logs in n8n
3. Check Slack alerts for failures
4. Verify email delivery

### Monitoring
- n8n built-in execution logs
- Supabase audit logs
- Email delivery tracking (Resend)
- Custom error logging table

---

## Environment Variables Needed

```env
# N8N
N8N_HOST=n8n.liftgo.net
N8N_WEBHOOK_URL=https://n8n.liftgo.net/webhook
N8N_API_KEY=key_xxx

# Supabase (already configured)
SUPABASE_SERVICE_ROLE_KEY=...

# Resend (already configured)
RESEND_API_KEY=...

# Stripe (already configured)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Slack (if not already configured)
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...

# Twilio (optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

---

## Deployment Architecture

```
┌─────────────┐
│ Supabase    │ ──webhook──> ┌─────────────┐
│ PostgreSQL  │              │   N8N       │
└─────────────┘              │ Orchestrator│
                             └──────┬──────┘
┌─────────────┐                     │
│ Stripe      │ ──webhook──>        │
└─────────────┘                     │
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    v                                v
            ┌──────────────┐              ┌──────────────┐
            │ Resend Email │              │ Push Service │
            └──────────────┘              └──────────────┘
                                                   
                                          ┌──────────────┐
                                          │ Slack Alerts │
                                          └──────────────┘
```

---

## Monitoring Checklist

- [ ] N8N dashboard accessible
- [ ] All connections tested (Supabase, Stripe, Resend)
- [ ] Webhook URLs registered in LiftGO API
- [ ] Error handling configured
- [ ] Logging to database working
- [ ] Slack alerts operational
- [ ] Email delivery verified
- [ ] Database updates confirmed

---

## Rollback Plan

If issues occur:
1. Disable failing workflow in n8n
2. Keep manual fallback process ready
3. Use QStash job queue as backup
4. Monitor error queue for retry
5. Alert team on Slack

---

## Related Documentation
- [LiftGO CLAUDE.md](../CLAUDE.md) - Project IDs and setup
- [Task Engine Documentation](../docs/TASK_ENGINE_QUICK_REFERENCE.md)
- [Stripe Integration](../STRIPE_INTEGRATION.md)
