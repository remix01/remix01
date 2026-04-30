export type CoreRoleAgentType =
  | 'onboarding_assistant'
  | 'provider_coach'
  | 'payment_helper'
  | 'support_agent'

export type LegacyAIAgentType =
  | 'general_chat'
  | 'work_description'
  | 'offer_comparison'
  | 'scheduling_assistant'
  | 'video_diagnosis'
  | 'quote_generator'
  | 'materials_agent'
  | 'job_summary'
  | 'offer_writing'
  | 'profile_optimization'

export type AIAgentType = CoreRoleAgentType | LegacyAIAgentType

export function mapLegacyAgentType(agentType: AIAgentType): CoreRoleAgentType {
  switch (agentType) {
    case 'quote_generator':
    case 'materials_agent':
    case 'offer_writing':
    case 'profile_optimization':
    case 'provider_coach':
      return 'provider_coach'
    case 'scheduling_assistant':
    case 'work_description':
    case 'onboarding_assistant':
      return 'onboarding_assistant'
    case 'payment_helper':
      return 'payment_helper'
    default:
      return 'support_agent'
  }
}

const CORE_DAILY_LIMITS: Record<string, Record<CoreRoleAgentType, number>> = {
  start: {
    onboarding_assistant: 10,
    provider_coach: 8,
    payment_helper: 8,
    support_agent: 12,
  },
  pro: {
    onboarding_assistant: 100,
    provider_coach: 100,
    payment_helper: 100,
    support_agent: 120,
  },
  elite: {
    onboarding_assistant: 250,
    provider_coach: 250,
    payment_helper: 250,
    support_agent: 300,
  },
  enterprise: {
    onboarding_assistant: Infinity,
    provider_coach: Infinity,
    payment_helper: Infinity,
    support_agent: Infinity,
  },
}

export const AGENT_DAILY_LIMITS: Record<string, Record<AIAgentType, number>> = {
  start: {} as Record<AIAgentType, number>,
  pro: {} as Record<AIAgentType, number>,
  elite: {} as Record<AIAgentType, number>,
  enterprise: {} as Record<AIAgentType, number>,
}

for (const tier of Object.keys(AGENT_DAILY_LIMITS) as Array<keyof typeof AGENT_DAILY_LIMITS>) {
  const core = CORE_DAILY_LIMITS[tier]
  const record = AGENT_DAILY_LIMITS[tier]
  const aliases: Record<AIAgentType, CoreRoleAgentType> = {
    onboarding_assistant: 'onboarding_assistant', provider_coach: 'provider_coach', payment_helper: 'payment_helper', support_agent: 'support_agent',
    general_chat: 'support_agent', work_description: 'onboarding_assistant', offer_comparison: 'support_agent', scheduling_assistant: 'onboarding_assistant', video_diagnosis: 'support_agent', quote_generator: 'provider_coach', materials_agent: 'provider_coach', job_summary: 'support_agent', offer_writing: 'provider_coach', profile_optimization: 'provider_coach',
  }
  for (const [agent, role] of Object.entries(aliases) as Array<[AIAgentType, CoreRoleAgentType]>) {
    record[agent] = core[role]
  }
}

export function isAgentAccessible(_agentType: AIAgentType, _userTier: string): boolean {
  return true
}

export function getAgentDailyLimit(agentType: AIAgentType, userTier: string): number {
  const tierLimits = AGENT_DAILY_LIMITS[userTier] ?? AGENT_DAILY_LIMITS.start
  return (tierLimits as Record<string, number>)[agentType] ?? 0
}

export const AGENT_META: Record<AIAgentType, {
  label: string
  description: string
  icon: string
  tier: string | null
  async: boolean
  roles: ('narocnik' | 'obrtnik')[]
}> = {
  onboarding_assistant: { label: 'Onboarding Assistant', description: 'Guides users through setup and first actions without executing decisions.', icon: 'UserPlus', tier: null, async: false, roles: ['narocnik', 'obrtnik'] },
  provider_coach: { label: 'Provider Coach', description: 'Helps providers improve offers and profiles with suggestions only.', icon: 'Briefcase', tier: null, async: false, roles: ['obrtnik'] },
  payment_helper: { label: 'Payment Helper', description: 'Explains payment status and next steps only.', icon: 'CreditCard', tier: null, async: false, roles: ['narocnik', 'obrtnik'] },
  support_agent: { label: 'Support Agent', description: 'General support and escalation guidance.', icon: 'LifeBuoy', tier: null, async: false, roles: ['narocnik', 'obrtnik'] },
  general_chat: { label: 'Support Agent (legacy)', description: 'Legacy alias to support agent.', icon: 'MessageCircle', tier: null, async: false, roles: ['narocnik', 'obrtnik'] },
  work_description: { label: 'Onboarding Assistant (legacy)', description: 'Legacy alias to onboarding assistant.', icon: 'ClipboardList', tier: null, async: false, roles: ['narocnik'] },
  offer_comparison: { label: 'Support Agent (legacy)', description: 'Legacy alias to support agent.', icon: 'BarChart2', tier: null, async: false, roles: ['narocnik'] },
  scheduling_assistant: { label: 'Onboarding Assistant (legacy)', description: 'Legacy alias to onboarding assistant.', icon: 'Calendar', tier: null, async: false, roles: ['narocnik'] },
  video_diagnosis: { label: 'Support Agent (legacy)', description: 'Legacy alias to support agent.', icon: 'Video', tier: null, async: false, roles: ['narocnik'] },
  quote_generator: { label: 'Provider Coach (legacy)', description: 'Legacy alias to provider coach.', icon: 'FileText', tier: null, async: false, roles: ['obrtnik'] },
  materials_agent: { label: 'Provider Coach (legacy)', description: 'Legacy alias to provider coach.', icon: 'Package', tier: null, async: false, roles: ['obrtnik'] },
  job_summary: { label: 'Support Agent (legacy)', description: 'Legacy alias to support agent.', icon: 'ClipboardCheck', tier: null, async: false, roles: ['obrtnik'] },
  offer_writing: { label: 'Provider Coach (legacy)', description: 'Legacy alias to provider coach.', icon: 'PenTool', tier: null, async: false, roles: ['obrtnik'] },
  profile_optimization: { label: 'Provider Coach (legacy)', description: 'Legacy alias to provider coach.', icon: 'TrendingUp', tier: null, async: false, roles: ['obrtnik'] },
}
