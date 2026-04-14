import type { AIAgentType } from '@/lib/agents/ai-router'

const ROUTING_RULES: Array<{ intent: string; agents: AIAgentType[]; keywords: string[] }> = [
  {
    intent: 'pricing_estimate',
    agents: ['quote_generator', 'materials_agent'],
    keywords: ['koliko', 'cena', 'price', 'quote', 'predračun', 'cost'],
  },
  {
    intent: 'media_diagnosis',
    agents: ['video_diagnosis', 'work_description'],
    keywords: ['image', 'slika', 'photo', 'leak', 'pušča', 'video'],
  },
  {
    intent: 'scheduling',
    agents: ['scheduling_assistant'],
    keywords: ['termin', 'schedule', 'appointment', 'čas', 'kdaj'],
  },
  {
    intent: 'offer_review',
    agents: ['offer_comparison'],
    keywords: ['ponudb', 'primerj', 'compare', 'offer'],
  },
]

export function determineRouting(message: string, hasMedia: boolean): {
  intent: string
  requiredAgents: AIAgentType[]
} {
  const normalized = message.toLowerCase()

  if (hasMedia) {
    return {
      intent: 'media_diagnosis',
      requiredAgents: ['video_diagnosis', 'work_description'],
    }
  }

  const match = ROUTING_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)))

  if (!match) {
    return {
      intent: 'general_help',
      requiredAgents: ['work_description', 'job_summary'],
    }
  }

  return {
    intent: match.intent,
    requiredAgents: match.agents,
  }
}
