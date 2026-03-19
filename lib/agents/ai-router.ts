export type AIAgentType =
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

export const AGENT_DAILY_LIMITS: Record<string, Record<AIAgentType, number>> = {
  start: {
    general_chat: 5,
    work_description: 3,
    offer_comparison: 2,
    scheduling_assistant: 3,
    video_diagnosis: 0,
    quote_generator: 3,
    materials_agent: 0,
    job_summary: 3,
    offer_writing: 0,
    profile_optimization: 0,
  },
  pro: {
    general_chat: 100,
    work_description: 20,
    offer_comparison: 15,
    scheduling_assistant: 20,
    video_diagnosis: 10,
    quote_generator: 30,
    materials_agent: 15,
    job_summary: 30,
    offer_writing: 30,
    profile_optimization: 10,
  },
  elite: {
    general_chat: 300,
    work_description: 100,
    offer_comparison: 50,
    scheduling_assistant: 100,
    video_diagnosis: 50,
    quote_generator: 100,
    materials_agent: 50,
    job_summary: 100,
    offer_writing: 100,
    profile_optimization: 50,
  },
  enterprise: {
    general_chat: Infinity,
    work_description: Infinity,
    offer_comparison: Infinity,
    scheduling_assistant: Infinity,
    video_diagnosis: Infinity,
    quote_generator: Infinity,
    materials_agent: Infinity,
    job_summary: Infinity,
    offer_writing: Infinity,
    profile_optimization: Infinity,
  },
}

const TIER_RESTRICTED: AIAgentType[] = [
  'video_diagnosis',
  'materials_agent',
  'offer_writing',
  'profile_optimization',
]

export function isAgentAccessible(agentType: AIAgentType, userTier: string): boolean {
  if (!TIER_RESTRICTED.includes(agentType)) return true
  return userTier === 'pro' || userTier === 'enterprise'
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
  general_chat: {
    label: 'Splošni asistent',
    description: 'Pomoč pri navigaciji in splošnih vprašanjih',
    icon: 'MessageCircle',
    tier: null,
    async: false,
    roles: ['narocnik', 'obrtnik'],
  },
  work_description: {
    label: 'Opis dela',
    description: 'Pomaga sestaviti jasno povpraševanje za mojstre',
    icon: 'ClipboardList',
    tier: null,
    async: false,
    roles: ['narocnik'],
  },
  offer_comparison: {
    label: 'Primerjaj ponudbe',
    description: 'Primerja prejete ponudbe in priporoči najboljšo',
    icon: 'BarChart2',
    tier: null,
    async: false,
    roles: ['narocnik'],
  },
  scheduling_assistant: {
    label: 'Urnik in termini',
    description: 'Predlaga termine na podlagi razpoložljivosti mojstra',
    icon: 'Calendar',
    tier: null,
    async: false,
    roles: ['narocnik'],
  },
  video_diagnosis: {
    label: 'Video diagnoza',
    description: 'AI ocena obsega dela iz slike (PRO)',
    icon: 'Video',
    tier: 'pro',
    async: true,
    roles: ['narocnik'],
  },
  quote_generator: {
    label: 'Generator ponudb',
    description: 'Hitro generira osnutek ponudbe na podlagi povpraševanja',
    icon: 'FileText',
    tier: null,
    async: false,
    roles: ['obrtnik'],
  },
  materials_agent: {
    label: 'Materiali in zaloge',
    description: 'Seznam materiala in okvirne cene za delo (PRO)',
    icon: 'Package',
    tier: 'pro',
    async: true,
    roles: ['obrtnik'],
  },
  job_summary: {
    label: 'Povzetek dela',
    description: 'Generira poročilo po opravljenem delu za stranko',
    icon: 'ClipboardCheck',
    tier: null,
    async: false,
    roles: ['obrtnik'],
  },
  offer_writing: {
    label: 'Piši ponudbo',
    description: 'Pomaga napisati profesionalno ponudbo (PRO)',
    icon: 'PenTool',
    tier: 'pro',
    async: false,
    roles: ['obrtnik'],
  },
  profile_optimization: {
    label: 'Optimizacija profila',
    description: 'Izboljšaj profil za več posla (PRO)',
    icon: 'TrendingUp',
    tier: 'pro',
    async: false,
    roles: ['obrtnik'],
  },
}
