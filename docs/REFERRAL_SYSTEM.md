# Referral System Implementation

## Overview

The LiftGO referral system creates a viral growth loop where partners can invite friends and both parties receive €5 credits when the referred user completes their first job.

## Architecture

### Database Schema

**Additions to `profiles` table:**
- `referral_code` (VARCHAR(12)): Unique code like "LIFTGO_K9M2R"
- `credit_balance` (NUMERIC): Accrued credits from referrals
- `pro_days_earned` (INTEGER): Bonus PRO subscription days

**New `referrals` table:**
- `id` (UUID): Primary key
- `referrer_id` (UUID): User who invited
- `referred_id` (UUID): User who was invited
- `reward_granted` (BOOLEAN): Whether bonus was awarded
- `reward_type` (VARCHAR): 'credit' or 'pro_days'
- `reward_amount` (NUMERIC): €5 or days count
- `created_at` (TIMESTAMP): When referral was created
- `completed_at` (TIMESTAMP): When first job completed

### Code Structure

```
lib/referral/
  ├── generateCode.ts          # Code generation & validation
  └── referralService.ts       # Business logic

app/api/referral/
  ├── validate/route.ts        # Check code validity
  └── stats/route.ts           # Get user stats

components/partner/
  └── ReferralSection.tsx      # Dashboard UI

app/api/webhooks/
  └── job-completed/route.ts   # Trigger bonuses
```

## User Flow

### 1. Referrer Gets Code
- On signup, `ensureReferralCode()` generates unique code (LIFTGO_XXXXX)
- Code stored in `profiles.referral_code`
- Accessible via `/api/referral/stats` endpoint

### 2. Partner Shares Link
- Dashboard shows referral link: `https://liftgo.net/registracija-mojster?ref=LIFTGO_XXXXX`
- One-click copy button
- Share via social/email

### 3. New User Sees Referrer
- Landing page detects `?ref=CODE` parameter
- Validates code via `/api/referral/validate`
- Shows "You've been invited by [Name]!" banner
- Displays bonus info (€5 credit both ways)

### 4. Registration with Referral
- Registration form includes `referralCode` field (auto-populated from URL)
- On signup, `processReferralCode()` creates referral record
- Sets `reward_granted = false` (pending first job)

### 5. First Job Completion
- When partner completes first job, webhook calls `/api/webhooks/job-completed`
- Triggers `awardReferralBonus(partnerId)`
- Awards €5 to both referrer and referred user
- Sets `reward_granted = true`
- Updates `credit_balance` on both profiles

## API Reference

### GET /api/referral/validate?code=LIFTGO_XXXXX
Validate referral code and get referrer info.

**Response:**
```json
{
  "valid": true,
  "referrerName": "Novak d.o.o."
}
```

### GET /api/referral/stats
Get current user's referral stats.

**Response:**
```json
{
  "referralCode": "LIFTGO_K9M2R",
  "referralLink": "https://liftgo.net/registracija-mojster?ref=LIFTGO_K9M2R",
  "creditBalance": 15,
  "successfulReferrals": 3,
  "pendingReferrals": 2
}
```

### POST /api/webhooks/job-completed
Award referral bonus when job completes.

**Request:**
```json
{
  "partnerId": "uuid",
  "jobId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "bonusAwarded": true
}
```

## Functions

### generateReferralCode()
Generates unique code: `LIFTGO_XXXXXX` (12 chars total)
- Alphanumeric, uppercase letters
- Retry up to 10 times if collision

### isValidReferralCode(code)
Validates format matches pattern `/^LIFTGO_[A-Z0-9]{6}$/`

### ensureReferralCode(userId)
Creates referral code if user doesn't have one.
- Checks existing code
- Generates new if needed
- Retries on collision
- Returns code

### processReferralCode(code, userId)
Links referred user to referrer.
- Finds referrer by code
- Creates referral record
- Returns success boolean

### awardReferralBonus(userId)
Awards €5 to both referrer and referred user.
- Finds unrewarded referral
- Updates `referrals.reward_granted = true`
- Increments `credit_balance` for both users
- Returns success boolean

### getReferralStats(userId)
Returns user's referral statistics.
- Referral code
- Credit balance
- Count of successful referrals
- Count of pending referrals

## Dashboard UI

The `ReferralSection` component displays:

1. **How It Works** - 3-step explanation
2. **Referral Link** - Copyable URL with share button
3. **Stats Grid** - Shows:
   - Successful referrals count
   - Pending referrals count
   - Earned credits total
4. **Rewards Explanation** - What users get
5. **Share Button** - Native share (if available)

## Integration Points

### Signup Flow
```typescript
// In registracija-mojster form
const referralCode = searchParams.get('ref')
// Show banner if valid
// Include in form submission
```

### Registration API
```typescript
// In /api/registracija-mojster
if (validatedData.referralCode) {
  await processReferralCode(validatedData.referralCode, userId)
}
// Generate code for new user
await ensureReferralCode(userId)
```

### Job Completion
```typescript
// Call when job marked complete
POST /api/webhooks/job-completed
{
  "partnerId": user.id,
  "jobId": completedJob.id
}
```

## Cron Jobs (Optional)

### Daily Referral Report
```typescript
// /api/cron/referral-report
// Email daily stats to admins
- New referrals count
- Bonuses awarded count
- Total credits issued
```

## Metrics to Track

- New signups with referral code vs without
- Referral conversion rate (% who complete first job)
- Average referrals per user
- Total credits issued
- Revenue impact (are referred users more valuable?)

## Security

1. **Code Uniqueness**: DB constraint ensures unique codes
2. **RLS Policies**: Users can only see their own referrals
3. **One Bonus Per Pair**: Unique constraint on (referrer_id, referred_id)
4. **Validation**: All codes validated before processing
5. **Admin Only**: Only admins can modify referral records

## Future Enhancements

1. **Tiered Bonuses**: €10 after 5 referrals, €20 after 10
2. **Referral History**: Show detailed timeline of referrals
3. **Leaderboard**: Top referrers monthly
4. **Email Notifications**: "Your friend completed their first job - bonus credited!"
5. **Credit Marketplace**: Exchange credits for PRO days or cash out
6. **Team Referrals**: Companies can pool referral bonuses
7. **Affiliate Program**: Partners get % commission on platform fees from referrals

## Testing

### Manual Testing
1. Create user A with special code
2. Get referral link
3. Sign up user B with referral code
4. Verify referral record created
5. Simulate job completion via `/api/webhooks/job-completed`
6. Verify €5 credited to both users

### Automated Tests
```typescript
describe('Referral System', () => {
  it('generates unique codes', () => { })
  it('validates code format', () => { })
  it('creates referral on signup', () => { })
  it('awards bonus on completion', () => { })
  it('prevents duplicate bonuses', () => { })
})
```

## Troubleshooting

### Code not appearing in URL
- Check `referral_code` column in profiles table
- Verify `ensureReferralCode()` is called in signup

### Referral code not working
- Validate code format with `isValidReferralCode()`
- Check referral code exists in database
- Verify referrer profile exists

### Bonus not awarded
- Check `/api/webhooks/job-completed` is called
- Verify `awardReferralBonus()` logic
- Check `credit_balance` updates in DB
- Review referral record state
