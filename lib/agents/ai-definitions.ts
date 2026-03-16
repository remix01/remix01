import { supabaseAdmin } from '@/lib/supabase-admin'

type AgentDefinition = {
  agent_type: string
  display_name: string
  description: string | null
  system_prompt: string
  model_preference: string
  required_tier: string[] | null
  enabled: boolean
}

// Hardcoded fallbacks in case DB is not yet migrated
const FALLBACK_DEFINITIONS: Record<string, Partial<AgentDefinition>> = {
  general_chat: {
    system_prompt: `Si LiftGO asistent za Slovenijo.
Pomagaš strankam najti prave mojstre za njihova dela.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj: kje se nahaja, kako nujno je, ali ima proračun.
Nato jim ponudi da oddajo povpraševanje na /narocnik/novo-povprasevanje`,
    model_preference: 'auto',
    required_tier: null,
  },
}

export async function getAgentDefinition(agentType: string): Promise<AgentDefinition> {
  try {
    const { data } = await supabaseAdmin
      .from('agent_definitions')
      .select('*')
      .eq('agent_type', agentType)
      .eq('enabled', true)
      .maybeSingle()

    if (data) return data as AgentDefinition
  } catch {
    // DB not migrated yet — use fallback
  }

  return {
    agent_type: agentType,
    display_name: agentType,
    description: null,
    system_prompt: FALLBACK_DEFINITIONS[agentType]?.system_prompt ?? FALLBACK_DEFINITIONS.general_chat.system_prompt!,
    model_preference: FALLBACK_DEFINITIONS[agentType]?.model_preference ?? 'auto',
    required_tier: FALLBACK_DEFINITIONS[agentType]?.required_tier ?? null,
    enabled: true,
  }
}
