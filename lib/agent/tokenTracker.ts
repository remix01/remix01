/**
 * Token Usage Tracker — Central cost control for all AI agents
 *
 * Logs token consumption per user/agent and enforces monthly limits
 * based on the user's subscription plan:
 *   narocnik  → 10,000 tokens/month  (free tier)
 *   partner start → 50,000 tokens/month
 *   partner pro   → 500,000 tokens/month
 *   admin         → unlimited
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Claude pricing (USD per 1M tokens, approximate)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001':   { input: 0.25,  output: 1.25  },
  'claude-sonnet-4-5-20250514':  { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-6':           { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':             { input: 15.00, output: 75.00 },
  'claude-opus-4-20250514':      { input: 15.00, output: 75.00 },
}

// Monthly token limits by plan
export const PLAN_LIMITS: Record<string, number> = {
  narocnik:       10_000,
  partner_start:  50_000,
  partner_pro:    500_000,
  admin:          Infinity,
}

export type AgentName =
  | 'task-description'
  | 'offer-comparison'
  | 'scheduling'
  | 'video-diagnosis'
  | 'chat'
  | 'quote-generator'
  | 'materials'
  | 'job-summary'

// ── TRACK USAGE (fire-and-forget)
export function trackTokens(params: {
  userId: string
  agentName: AgentName
  model: string
  inputTokens: number
  outputTokens: number
  metadata?: Record<string, any>
}): void {
  const { userId, agentName, model, inputTokens, outputTokens, metadata } = params
  const totalTokens = inputTokens + outputTokens

  const pricing = MODEL_PRICING[model]
  const costUsd = pricing
    ? (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
    : null

  // Non-blocking insert
  supabaseAdmin
    .from('agent_token_usage')
    .insert({
      user_id: userId,
      agent_name: agentName,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      metadata: metadata ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn('[tokenTracker] insert failed:', error.message)
    })
}

// ── CHECK LIMIT (returns true if under limit)
export async function checkMonthlyLimit(
  userId: string,
  userPlan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.narocnik

  if (limit === Infinity) return { allowed: true, used: 0, limit: Infinity }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabaseAdmin
    .from('agent_token_usage')
    .select('total_tokens')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.warn('[tokenTracker] limit check failed:', error.message)
    return { allowed: true, used: 0, limit } // fail open
  }

  const used = (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0)
  return { allowed: used < limit, used, limit }
}

// ── RESOLVE PLAN for a user_id (checks partner_paketi, then profiles.role)
export async function resolveUserPlan(userId: string): Promise<string> {
  // Check if obrtnik with a plan
  const { data: paket } = await supabaseAdmin
    .from('partner_paketi')
    .select('paket')
    .eq('obrtnik_id', userId)
    .maybeSingle()

  if (paket?.paket === 'pro')   return 'partner_pro'
  if (paket?.paket === 'start') return 'partner_start'

  // Check role from profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'admin')    return 'admin'
  if (profile?.role === 'obrtnik')  return 'partner_start'

  return 'narocnik'
}

// ── CONVENIENCE: check + block with standard error response
export async function enforceLimit(
  userId: string
): Promise<{ allowed: boolean; errorMsg?: string }> {
  const plan = await resolveUserPlan(userId)
  const result = await checkMonthlyLimit(userId, plan)

  if (!result.allowed) {
    const pct = Math.round((result.used / result.limit) * 100)
    return {
      allowed: false,
      errorMsg: `Presegli ste mesečno kvoto AI tokenov (${pct}% izkoriščeno). Nadgradite paket za večjo kvoto.`,
    }
  }
  return { allowed: true }
}
