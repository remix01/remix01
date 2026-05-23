import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAgentDailyLimit, isAgentAccessible, type AIAgentType } from '@/lib/agents/ai-router'
import { isFlagEnabled, type FlagKey } from '@/lib/feature-flags'

const DAILY_RESET_WINDOW_MS = 24 * 60 * 60 * 1000

export type AiUsageProfile = {
  subscription_tier?: string | null
  ai_messages_used_today?: number | null
  ai_messages_reset_at?: string | null
}

export async function loadAiUsageProfile(userId: string): Promise<AiUsageProfile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('subscription_tier, ai_messages_used_today, ai_messages_reset_at')
    .eq('id', userId)
    .maybeSingle()

  return data
}

export async function normalizeDailyUsageWindow(userId: string, profile: AiUsageProfile | null): Promise<number> {
  const usedToday = profile?.ai_messages_used_today ?? 0
  const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)

  if (Date.now() - resetAt.getTime() <= DAILY_RESET_WINDOW_MS) {
    return usedToday
  }

  await supabaseAdmin
    .from('profiles')
    .update({ ai_messages_used_today: 0, ai_messages_reset_at: new Date().toISOString() })
    .eq('id', userId)

  return 0
}

// Agents that require an explicit feature flag in addition to tier gating.
// Flag must be enabled (or FEATURE_<FLAG>=1 env var set) for access to be granted.
const AGENT_GATE_FLAGS: Partial<Record<AIAgentType, FlagKey>> = {
  quote_generator: 'AI_QUOTE_GENERATOR',
  materials_agent: 'AI_MATERIALS_AGENT',
  video_diagnosis: 'VIDEO_DIAGNOSIS',
  job_summary:     'JOB_SUMMARY_AI',
}

export function evaluateAgentTierAccess(agentType: AIAgentType, tier: string) {
  const flagKey = AGENT_GATE_FLAGS[agentType]
  if (flagKey !== undefined) {
    const plan: 'START' | 'PRO' =
      (tier === 'pro' || tier === 'elite' || tier === 'enterprise') ? 'PRO' : 'START'
    if (!isFlagEnabled(flagKey, plan)) {
      return { allowed: false, dailyLimit: 0 }
    }
  }
  return {
    allowed: isAgentAccessible(agentType, tier),
    dailyLimit: getAgentDailyLimit(agentType, tier),
  }
}

export async function incrementDailyUsage(userId: string, nextUsed: number): Promise<void> {
  await supabaseAdmin
    .from('profiles')
    .update({ ai_messages_used_today: nextUsed })
    .eq('id', userId)
}
