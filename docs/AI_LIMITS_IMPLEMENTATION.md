# AI Subscription Tier System - Implementation Summary

## Overview

The AI chat system now respects subscription tiers from the Supabase `profiles` table. Users are limited by daily message quotas based on their subscription level, with automatic reset after 24 hours. The system is fully monetized with three paid tiers and enterprise support.

## Implementation Details

### 1. **Subscription Tiers**

```typescript
// From lib/agents/ai-router.ts
const AGENT_DAILY_LIMITS = {
  start: {     // Free tier
    general_chat: 5,
    quote_generator: 3,
    job_summary: 3,
    // ... other agents limited
    video_diagnosis: 0,      // Restricted
    materials_agent: 0,      // Restricted
    offer_writing: 0,        // Restricted
  },
  pro: {       // €29/month
    general_chat: 100,
    quote_generator: 30,
    job_summary: 30,
    video_diagnosis: 10,     // Now accessible
    materials_agent: 15,     // Now accessible
    offer_writing: 30,       // Now accessible
  },
  elite: {     // €79/month (NEW)
    general_chat: 300,
    quote_generator: 100,
    job_summary: 100,
    video_diagnosis: 50,
    materials_agent: 50,
    offer_writing: 100,
  },
  enterprise: {
    // All agents: Infinity
  }
}
```

### 2. **Database Schema**

The `profiles` table tracks AI usage:
- `subscription_tier` - User's subscription level ('start', 'pro', 'elite', 'enterprise')
- `ai_messages_used_today` - Integer counter (resets every 24h)
- `ai_messages_reset_at` - TIMESTAMPTZ of when counter was reset
- `ai_total_tokens_used` - Lifetime token usage (BIGINT)
- `ai_total_cost_usd` - Lifetime cost tracking (NUMERIC)

### 3. **API Routes Implementing Limits**

All agent endpoints check limits before processing:

#### `/api/agent/chat/route.ts` (General Chat)
- Checks user's subscription_tier
- Looks up TIER_LIMITS[tier]
- Compares ai_messages_used_today vs limit
- Returns 429 error if exceeded
- Increments counter on success

```typescript
// Hard limit check
if (usedToday >= dailyLimit) {
  return NextResponse.json({
    error: `Dnevni limit dosežen (${dailyLimit}). ${tier === 'start' ? 'Nadgradite na PRO...' : 'Poskusite jutri.'}`,
    limit_reached: true,
    used: usedToday,
    limit: dailyLimit,
  }, { status: 429 })
}

// Soft limit warning (80%)
if (usedToday >= Math.floor(dailyLimit * 0.8)) {
  warning = `Opozorilo: Porabili ste ${usedToday}/${dailyLimit} dnevnih sporočil.`
}
```

#### `/api/agent/[agentType]/route.ts` (Dynamic Agents)
- Uses `getAgentDailyLimit(agentType, tier)` for agent-specific limits
- Calls `isAgentAccessible(agentType, tier)` to block restricted agents
- Same 24h reset logic

#### `/api/agent/quote-generator/route.ts`
#### `/api/agent/materials/route.ts`
#### `/api/agent/job-summary/route.ts`
All use centralized `getAgentDailyLimit()` function → automatic elite tier support

### 4. **Access Control**

Restricted agents (only available to PRO+):
```typescript
const TIER_RESTRICTED: AIAgentType[] = [
  'video_diagnosis',      // Image-based work estimation
  'materials_agent',      // Material & supplier lists
  'offer_writing',        // Professional quote writing
  'profile_optimization', // AI profile enhancement
]

// Usage
if (!isAgentAccessible('video_diagnosis', userTier)) {
  return 403 error
}
```

### 5. **24-Hour Reset Logic**

Every API call checks if counter needs reset:
```typescript
const resetAt = profile?.ai_messages_reset_at ? new Date(...) : new Date(0)
if (Date.now() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
  // Reset counter
  await supabaseAdmin.from('profiles').update({
    ai_messages_used_today: 0,
    ai_messages_reset_at: new Date().toISOString()
  }).eq('id', user.id)
}
```

### 6. **Error Responses**

Hard limit exceeded (429):
```json
{
  "error": "Dnevni limit dosežen (5). Nadgradite na PRO za 100 sporočil/dan.",
  "limit_reached": true,
  "used": 5,
  "limit": 5
}
```

Access denied for tier (403):
```json
{
  "error": "Ta agent je na voljo samo za PRO naročnike.",
  "upgrade_required": true,
  "upgrade_url": "/cenik"
}
```

### 7. **Usage Response**

Every successful response includes usage info:
```json
{
  "message": "...",
  "usage": {
    "used": 3,
    "limit": 100  // null for unlimited
  },
  "warning": "Opozorilo: Porabili ste 80/100 dnevnih sporočil."
}
```

## Tier Pricing & Quotas

| Feature | START | PRO | ELITE | ENTERPRISE |
|---------|-------|-----|-------|------------|
| Monthly Cost | €0 | €29 | €79 | Custom |
| Commission | 10% | 5% | ~10% | Custom |
| General Chat/day | 5 | 100 | 300 | ∞ |
| Quote Generator/day | 3 | 30 | 100 | ∞ |
| Materials Agent/day | 0 | 15 | 50 | ∞ |
| Video Diagnosis/day | 0 | 10 | 50 | ∞ |
| Offer Writing/day | 0 | 30 | 100 | ∞ |

## Files Modified

1. **lib/agents/ai-router.ts**
   - Added `elite` tier to `AGENT_DAILY_LIMITS`
   - All per-agent quotas for ELITE tier

2. **app/api/agent/chat/route.ts**
   - Added `elite: 300` to `TIER_LIMITS`

3. **components/pricing-comparison.tsx**
   - Added ELITE plan (€79) to pricing page
   - Added customers section (FREE + PREMIUM €9)
   - Responsive cards for all tiers

4. **STRIPE_INTEGRATION.md**
   - Updated documentation with ELITE tier info
   - Added AI limits table
   - Updated test procedures

## Testing

### Test with START Tier (5 limit)
```bash
# 1. Create user with subscription_tier = 'start'
# 2. Call API 5 times → success
# 3. Call API 6th time → 429 error with "Dnevni limit dosežen (5)"
# 4. Verify ai_messages_used_today = 5 in profiles table
```

### Test 24-Hour Reset
```bash
# 1. Set ai_messages_reset_at to 25 hours ago
# 2. Call API → counter resets to 0 automatically
# 3. Verify ai_messages_reset_at = now()
```

### Test ELITE Access
```bash
# 1. Create user with subscription_tier = 'elite'
# 2. Can call video_diagnosis (normally restricted to PRO+)
# 3. Can make 300 general_chat calls
# 4. Soft limit warning at 240 (80%)
```

## Frontend Integration (Client-Side)

Components should handle the new `usage` field:
```typescript
const response = await fetch('/api/agent/chat', { 
  method: 'POST', 
  body: JSON.stringify({ message })
})
const { message, usage, warning, limit_reached } = await response.json()

if (limit_reached) {
  showUpgradePrompt(usage.used, usage.limit)
}
if (warning) {
  showSoftLimitWarning(warning)
}
```

## Migration Path (Already Done)

The Stripe webhook was fixed to:
1. Only update `profiles` table (single source of truth)
2. Set `subscription_tier` correctly on checkout completion
3. Support 'elite' and 'enterprise' tiers

No additional database migrations needed - schema already supports all tiers.

## Monitoring & Analytics

Usage is logged to `ai_usage_logs` table:
- `user_id` - Which user made the call
- `model_used` - 'haiku-4', 'sonnet-4', 'cached'
- `agent_type` - 'general_chat', 'quote_generator', etc.
- `tokens_input` / `tokens_output` - Token consumption
- `cost_usd` - Estimated cost
- `response_cached` - Boolean
- `created_at` - Timestamp

This enables:
- Per-user cost tracking
- Agent usage analytics
- Cache hit rate monitoring
- Revenue attribution

## Success Criteria

✅ AI system respects subscription_tier from profiles  
✅ Daily limits enforced per tier and agent  
✅ Hard errors when limit exceeded (429)  
✅ Soft warnings at 80% usage  
✅ Automatic 24h reset  
✅ Restricted agents blocked for START tier  
✅ ELITE tier with 3x PRO quotas  
✅ Centralized limit configuration  
✅ Usage tracking & analytics ready  
✅ Pricing page reflects all three tiers  
✅ Stripe webhook correctly updates profiles  

## Environment Setup

No new environment variables needed. Uses existing:
- `ANTHROPIC_API_KEY` - Claude API access
- Database credentials for `profiles` table

## Next Steps (Optional)

1. Add admin dashboard to view per-user usage
2. Implement automatic email alerts before limit exceeded
3. Add mid-tier plans (PRO-S at €49)
4. Implement usage-based billing for ENTERPRISE
5. Add team/organization tier sharing
