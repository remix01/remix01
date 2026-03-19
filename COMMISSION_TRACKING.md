# Commission Tracking Implementation

## Overview

Complete commission tracking system for completed jobs. Captures platform commission (10% for START, 5% for PRO plans) and manages partner payouts through Stripe Connect.

**Key Features:**
- Automatic commission calculation on job completion
- Stripe Connect transfers to partner accounts
- Retry logic for failed transfers
- Revenue analytics for admins
- Commission history for partners
- Event-driven architecture with exactly-once delivery

---

## Architecture

### 1. Database Tables

#### `commission_logs` (20260320_commission_tracking.sql)
```sql
CREATE TABLE commission_logs (
  id UUID PRIMARY KEY
  escrow_id UUID REFERENCES escrow_transactions(id)
  partner_id UUID REFERENCES partners(id)
  inquiry_id UUID REFERENCES inquiries(id)
  
  -- Financial breakdown (in cents)
  gross_amount_cents INTEGER        -- Full job amount
  commission_rate NUMERIC(5,4)      -- 0.10 = 10%, 0.05 = 5%
  commission_cents INTEGER          -- Amount kept by platform
  partner_payout_cents INTEGER      -- Amount transferred to partner
  
  -- Stripe
  stripe_transfer_id TEXT UNIQUE
  stripe_account_id TEXT
  
  -- Status lifecycle
  status TEXT ('pending' | 'earned' | 'transferred' | 'failed' | 'refunded')
  
  -- Timestamps
  completed_at TIMESTAMPTZ
  captured_at TIMESTAMPTZ
  transferred_at TIMESTAMPTZ
  failed_at TIMESTAMPTZ
  refunded_at TIMESTAMPTZ
  
  -- Retry tracking
  transfer_attempts INTEGER
  last_error TEXT
  last_attempted_at TIMESTAMPTZ
)
```

**Why in cents?** Avoids floating-point precision errors. €10.50 stored as 1050 cents.

---

### 2. Services

#### `lib/services/commissionService.ts`

**Core Methods:**

```typescript
// Create commission log when job completes
async createCommissionLog(params: {
  escrowId: string
  partnerId: string
  inquiryId?: string
  grossAmountCents: number
  commissionRate: number  // 0.10, 0.05
  stripeAccountId?: string
}): Promise<{ id, commission, payout }>

// Transfer commission payout to partner's Stripe account
async transferToPartner(
  commissionId: string,
  stripeAccountId: string,
  amountCents: number
): Promise<TransferResult>

// Retry failed transfers (called by cron)
async retryFailedTransfers(): Promise<{
  retried: number
  succeeded: number
  failed: number
}>

// Refund commission if job disputed
async refundCommission(commissionId: string): Promise<void>

// Get partner's commission history
async getPartnerCommissions(partnerId: string, months?: number)

// Get platform revenue summary
async getPlatformRevenue(months?: number)
```

---

### 3. Event-Driven Flow

#### Commission Subscriber: `lib/events/subscribers/commissionSubscriber.ts`

Listens to events and creates commission logs:

```
1. payment.released event emitted
   ↓
2. CommissionSubscriber catches event
   ↓
3. Create commission_logs row with status='earned'
   ↓
4. Fetch partner's stripe_account_id
   ↓
5. Call transferToPartner() to send payout
   ↓
6a. Success? → status='transferred', log stripe_transfer_id
   ↓
6b. Failed? → status='failed', schedule retry
```

---

## Integration Points

### When Job is Completed

Current flow in `app/api/payments/confirm-completion/route.ts`:

```typescript
// 1. Update job status to COMPLETED
await supabaseAdmin.from('job').update({ status: 'COMPLETED' })

// 2. Update payment status to RELEASED
await supabaseAdmin.from('payment').update({ status: 'RELEASED' })

// 3. Emit payment.released event ← TRIGGERS COMMISSION TRACKING
await eventBus.emit('payment.released', {
  taskId,
  partnerId,
  amount,
  commission,
  netAmount,
  releasedAt: new Date().toISOString(),
})
```

**Commission tracking happens automatically** when the event is emitted.

---

## API Endpoints

### Partner Commission History
```
GET /api/partner/commissions?months=3
Auth: Required (Partner)

Response:
{
  "success": true,
  "data": {
    "total_jobs": 12,
    "total_gross_eur": 1200.00,
    "total_commission_eur": 60.00,     // Commission earned (not paid to partner)
    "total_payout_eur": 1140.00,       // Amount partner receives
    "transferred_count": 10,            // Successfully paid
    "pending_count": 1,                 // Awaiting transfer
    "failed_count": 1,                  // Transfer failed
    "logs": [
      {
        "id": "uuid",
        "gross_amount_cents": 100000,
        "commission_cents": 5000,
        "partner_payout_cents": 95000,
        "status": "transferred",
        "transferred_at": "2025-03-20T10:00:00Z"
      }
      ...
    ]
  },
  "period_months": 3
}
```

### Admin Revenue Dashboard
```
GET /api/admin/revenue?months=3
Auth: Required (Admin only)

Response:
{
  "success": true,
  "data": {
    "total_commission_eur": 850.00,      // All commissions
    "earned_commission_eur": 820.00,     // Earned (not pending)
    "transferred_commission_eur": 750.00, // Already paid to partners
    "pending_commission_eur": 70.00,      // Awaiting transfer
    "jobs_completed": 95                  // Total completed jobs
  },
  "period_months": 3
}
```

### Retry Failed Transfers (Cron)
```
GET /api/cron/retry-commission-transfers
Auth: Vercel Cron Secret

Response:
{
  "success": true,
  "message": "Commission transfer retry job completed",
  "retried": 3,
  "succeeded": 2,
  "failed": 1
}
```

---

## Commission Rates

Configured in `lib/stripe/config.ts`:

```typescript
STRIPE_PRODUCTS = {
  START: {
    commission: 10        // 10% on every job
  },
  PRO: {
    commission: 5         // 5% on every job
  },
  ELITE: {
    commission: 10        // ~10% (often negotiated)
  }
}
```

**How it's applied:**

1. When escrow transaction is created, commission_rate is set based on partner's subscription
2. When job completes, commission = job_amount * commission_rate
3. Partner receives: job_amount - commission

---

## Data Flow Example

**Job: €1000 with 5% commission (PRO partner)**

```
1. Customer pays €1000 → Escrow holds funds
   escrow_transactions: {
     amount_total_cents: 100000
     commission_rate: 0.05
     commission_cents: 5000
     payout_cents: 95000
     status: 'paid'
   }

2. Job marked COMPLETED → payment.released emitted
   ↓
   CommissionSubscriber catches event
   
3. Commission log created:
   commission_logs: {
     escrow_id: '...'
     gross_amount_cents: 100000
     commission_cents: 5000
     partner_payout_cents: 95000
     status: 'earned'
     captured_at: now
   }

4. Stripe transfer created:
   stripe.transfers.create({
     amount: 95000,  // €950
     destination: partner_stripe_account_id
   })
   
5. Commission log updated:
   {
     status: 'transferred'
     stripe_transfer_id: 'tr_...'
     transferred_at: now
   }

6. Partner receives €950 in Stripe account
   Platform keeps €50 commission
```

---

## Error Handling & Retries

### Transfer Fails

```
1. transferToPartner() throws error
   ↓
2. Commission log updated:
   {
     status: 'failed'
     last_error: 'stripe error message'
     failed_at: now
     transfer_attempts: 1
   }
   
3. Retry scheduled by cron job (/api/cron/retry-commission-transfers)
   Runs every 30 minutes
   Retries up to 3 times
   Must wait 1hr between attempts
```

### Max Retries Exceeded

After 3 failed attempts:
- Admin notified
- Commission log marked as `failed` permanently
- Manual intervention required
- Partner needs to be contacted

---

## Setup & Deployment

### 1. Run Migration

```bash
npx supabase migration up 20260320_commission_tracking.sql
```

Creates:
- `commission_logs` table
- Indexes for analytics queries
- RLS policies

### 2. Add Environment Variables

```env
# Already exists from Stripe integration
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# For cron job authentication
CRON_SECRET=your-secret-token
```

### 3. Register Commission Subscriber

Already done in `lib/events/index.ts`:
```typescript
export function initEventSubscribers() {
  registerCommissionSubscriber()  // ← Added
}
```

### 4. Set Up Cron Schedule

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/retry-commission-transfers",
    "schedule": "0 */30 * * * *"  // Every 30 minutes
  }]
}
```

---

## Monitoring & Analytics

### Query Examples

**Top earning partners (last 3 months):**
```sql
SELECT
  partner_id,
  COUNT(*) as jobs,
  SUM(partner_payout_cents) / 100.0 as total_payout_eur,
  AVG(gross_amount_cents) / 100.0 as avg_job_value
FROM commission_logs
WHERE created_at > NOW() - INTERVAL '3 months'
GROUP BY partner_id
ORDER BY total_payout_eur DESC
LIMIT 10;
```

**Platform revenue by subscription:**
```sql
SELECT
  p.subscription_tier,
  COUNT(cl.*) as jobs,
  SUM(cl.commission_cents) / 100.0 as commission_eur,
  SUM(cl.commission_cents) / 100.0 / COUNT(*) as avg_commission
FROM commission_logs cl
JOIN partners p ON cl.partner_id = p.id
WHERE cl.status IN ('transferred', 'earned')
GROUP BY p.subscription_tier;
```

**Pending transfers:**
```sql
SELECT
  partner_id,
  COUNT(*) as pending_jobs,
  SUM(partner_payout_cents) / 100.0 as pending_payout_eur,
  MAX(captured_at) as oldest_pending
FROM commission_logs
WHERE status IN ('pending', 'earned')
GROUP BY partner_id;
```

---

## Troubleshooting

### Commission not created

1. Check `event_log` table - was `payment.released` emitted?
2. Verify `escrow_transactions` exists with correct `commission_rate`
3. Check `commission_logs` - might be there with status='pending'

### Transfer failed repeatedly

1. Check `commission_logs.last_error` for error details
2. Verify partner's `stripe_account_id` exists
3. Test Stripe transfer manually with CLI:
   ```bash
   stripe transfers create \
     --amount=95000 \
     --currency=eur \
     --destination=acct_partner_stripe_id
   ```

### Partner not receiving payouts

1. Verify partner onboarded to Stripe Connect
2. Check `stripe_account_id` in partners table is correct
3. Check Stripe Dashboard - transfers showing?
4. Verify Stripe account currency is EUR

---

## Future Enhancements

1. **Batch transfers** - Group daily transfers to reduce fees
2. **Manual adjustments** - Admin UI to modify/reverse commissions
3. **Tax reporting** - Export commission history for tax filing
4. **Webhooks** - Notify partners when transfers complete
5. **Escrow disputes** - Automatically reverse commission if disputed
6. **Performance fees** - Bonus commission for top partners
