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
    onboarding_assistant: 20,
    provider_coach: 20,
    payment_helper: 20,
    support_agent: 20,
  },
  pro: {
    onboarding_assistant: 200,
    provider_coach: 200,
    payment_helper: 200,
    support_agent: 200,
  },
  elite: {
    onboarding_assistant: 500,
    provider_coach: 500,
    payment_helper: 500,
    support_agent: 500,
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

const PRO_ONLY_AGENTS: AIAgentType[] = [
  'quote_generator',
  'materials_agent',
  'video_diagnosis',
  'job_summary',
  'offer_writing',
  'profile_optimization',
  'provider_coach',
]

export function isAgentAccessible(agentType: AIAgentType, userTier: string): boolean {
  if (PRO_ONLY_AGENTS.includes(agentType)) {
    return userTier === 'pro' || userTier === 'elite' || userTier === 'enterprise'
  }
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
  tier: 'start' | 'pro' | null
  async: boolean
  roles: ('narocnik' | 'obrtnik')[]
}> = {
  onboarding_assistant: { label: 'Onboarding Assistant', description: 'Guides users through setup and first actions.', icon: 'UserPlus', tier: 'start', async: false, roles: ['narocnik', 'obrtnik'] },
  provider_coach: { label: 'Provider Coach', description: 'Helps providers improve offers and profiles (PRO).', icon: 'Briefcase', tier: 'pro', async: false, roles: ['obrtnik'] },
  payment_helper: { label: 'Payment Helper', description: 'Explains payment status and next steps.', icon: 'CreditCard', tier: 'start', async: false, roles: ['narocnik', 'obrtnik'] },
  support_agent: { label: 'Support Agent', description: 'General support and escalation guidance.', icon: 'LifeBuoy', tier: 'start', async: false, roles: ['narocnik', 'obrtnik'] },
  general_chat: { label: 'Asistent', description: 'Splošni LiftGO asistent.', icon: 'MessageCircle', tier: 'start', async: false, roles: ['narocnik', 'obrtnik'] },
  work_description: { label: 'Opis del', description: 'Pomoč pri opisu povpraševanja.', icon: 'ClipboardList', tier: 'start', async: false, roles: ['narocnik'] },
  offer_comparison: { label: 'Primerjava ponudb', description: 'Analiza in primerjava prejetih ponudb.', icon: 'BarChart2', tier: 'start', async: false, roles: ['narocnik'] },
  scheduling_assistant: { label: 'Razporejanje', description: 'Pomoč pri dogovarjanju termina.', icon: 'Calendar', tier: 'start', async: false, roles: ['narocnik'] },
  video_diagnosis: { label: 'Video diagnoza', description: 'Vizualna analiza težave (PRO).', icon: 'Video', tier: 'pro', async: true, roles: ['narocnik'] },
  quote_generator: { label: 'Generator ponudb', description: 'Avtomatsko ustvarjanje ponudb (PRO).', icon: 'FileText', tier: 'pro', async: false, roles: ['obrtnik'] },
  materials_agent: { label: 'Izračun materiala', description: 'Seznam in cene materiala (PRO).', icon: 'Package', tier: 'pro', async: false, roles: ['obrtnik'] },
  job_summary: { label: 'Povzetek del', description: 'Poročilo o opravljenem delu (PRO).', icon: 'ClipboardCheck', tier: 'pro', async: false, roles: ['obrtnik'] },
  offer_writing: { label: 'Pisanje ponudb', description: 'Pomoč pri sestavi profesionalne ponudbe (PRO).', icon: 'PenTool', tier: 'pro', async: false, roles: ['obrtnik'] },
  profile_optimization: { label: 'Optimizacija profila', description: 'Izboljšanje profila obrtnika (PRO).', icon: 'TrendingUp', tier: 'pro', async: false, roles: ['obrtnik'] },
}
