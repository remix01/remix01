export type AIAgentType =
  | 'general_chat'
  | 'work_description'
  | 'offer_writing'
  | 'offer_comparison'
  | 'scheduling'
  | 'video_diagnosis'
  | 'quote_generator'
  | 'materials_lookup'
  | 'job_summary'

// Daily message limits per tier per agent
export const AGENT_DAILY_LIMITS: Record<string, Record<AIAgentType, number>> = {
  start: {
    general_chat: 5,
    work_description: 3,
    offer_comparison: 2,
    offer_writing: 0,        // locked
    scheduling: 3,
    video_diagnosis: 0,      // locked
    quote_generator: 3,
    materials_lookup: 5,
    job_summary: 0,          // locked
  },
  pro: {
    general_chat: 100,
    work_description: 20,
    offer_comparison: 15,
    offer_writing: 30,
    scheduling: 20,
    video_diagnosis: 10,
    quote_generator: 30,
    materials_lookup: 50,
    job_summary: 20,
  },
  enterprise: {
    general_chat: Infinity,
    work_description: Infinity,
    offer_comparison: Infinity,
    offer_writing: Infinity,
    scheduling: Infinity,
    video_diagnosis: Infinity,
    quote_generator: Infinity,
    materials_lookup: Infinity,
    job_summary: Infinity,
  },
}

const TIER_RESTRICTED: AIAgentType[] = ['offer_writing', 'video_diagnosis', 'job_summary']

export function isAgentAccessible(agentType: AIAgentType, userTier: string): boolean {
  if (!TIER_RESTRICTED.includes(agentType)) return true
  return userTier === 'pro' || userTier === 'enterprise'
}

export function getAgentDailyLimit(agentType: AIAgentType, userTier: string): number {
  const tierLimits = AGENT_DAILY_LIMITS[userTier] ?? AGENT_DAILY_LIMITS.start
  return (tierLimits as Record<string, number>)[agentType] ?? 0
}

// Agent metadata for UI display
export const AGENT_META: Record<AIAgentType, { label: string; description: string; icon: string; tier: string | null }> = {
  general_chat: {
    label: 'Splošni asistent',
    description: 'Pomoč pri navigaciji in splošnih vprašanjih',
    icon: 'MessageCircle',
    tier: null,
  },
  work_description: {
    label: 'Opis dela',
    description: 'Pomaga sestaviti jasno povpraševanje za mojstre',
    icon: 'ClipboardList',
    tier: null,
  },
  offer_comparison: {
    label: 'Primerjaj ponudbe',
    description: 'Primerja prejete ponudbe in priporoči najboljšo',
    icon: 'BarChart2',
    tier: null,
  },
  offer_writing: {
    label: 'Piši ponudbo',
    description: 'Pomaga napisati profesionalno ponudbo (PRO)',
    icon: 'FileText',
    tier: 'pro',
  },
  scheduling: {
    label: 'Urnik & Termini',
    description: 'Predlaga optimalne termine za izvedbo dela',
    icon: 'Calendar',
    tier: null,
  },
  video_diagnosis: {
    label: 'Video diagnostika',
    description: 'Analiza slike/videa za oceno obsega dela (PRO)',
    icon: 'Camera',
    tier: 'pro',
  },
  quote_generator: {
    label: 'Hitri predračun',
    description: 'AI-generiran osnutek ponudbe na podlagi povpraševanja',
    icon: 'Zap',
    tier: null,
  },
  materials_lookup: {
    label: 'Material & Cene',
    description: 'Ocena materialov in tržnih cen za delo',
    icon: 'Package',
    tier: null,
  },
  job_summary: {
    label: 'Poročilo o delu',
    description: 'Async generiranje zaključnega poročila za stranko (PRO)',
    icon: 'FileCheck',
    tier: 'pro',
  },
}
