/**
 * AI Tools Module for LiftGO
 *
 * Defines tools that AI agents can use via function calling.
 */

import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getMorphFastApplyTool } from './morph'

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

export const AI_TOOLS: Tool[] = [
  {
    name: 'search_similar_tasks',
    description: 'Poišče podobna povpraševanja z uporabo semantičnega iskanja',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Iskalni niz (opis dela)' },
        limit: { type: 'number', description: 'Maksimalno število rezultatov' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_task_details',
    description: 'Pridobi podrobnosti o povpraševanju',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'UUID povpraševanja' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_market_price_range',
    description: 'Pridobi tržni razpon cen za podobna dela',
    input_schema: {
      type: 'object' as const,
      properties: {
        work_description: { type: 'string', description: 'Opis dela' },
      },
      required: ['work_description'],
    },
  },
  {
    name: 'execute_code_in_sandbox',
    description: 'Varno zažene kratko Python/JavaScript kodo v E2B sandboxu',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'Koda za izvedbo' },
        language: { type: 'string', enum: ['python', 'javascript'], description: 'Jezik izvedbe' },
      },
      required: ['code'],
    },
  },
  {
    name: 'edit_file_fastapply',
    description: 'Uporabi Morph FastApply za varno in hitro urejanje datoteke',
    input_schema: {
      type: 'object' as const,
      properties: {
        target_filepath: { type: 'string', description: 'Pot do ciljne datoteke v repozitoriju' },
        instructions: { type: 'string', description: 'Navodila za spremembo' },
        code_edit: { type: 'string', description: 'Predlagana vsebina ali patch spremembe' },
      },
      required: ['target_filepath', 'instructions', 'code_edit'],
    },
  },
  {
    name: 'find_matching_obrtniki',
    description: 'Najde mojstre, ki ustrezajo povpraševanju',
    input_schema: {
      type: 'object' as const,
      properties: {
        category_id: { type: 'string', description: 'UUID kategorije' },
        location: { type: 'string', description: 'Lokacija' },
      },
      required: ['category_id'],
    },
  },
]

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  async search_similar_tasks(input) {
    const { query, limit = 5 } = input as { query: string; limit?: number }
    const { searchTasks } = await import('./rag')
    return searchTasks(query, { limit })
  },

  async get_task_details(input) {
    const { task_id } = input as { task_id: string }
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, description, status, category_id')
      .eq('id', task_id)
      .single()
    if (error) throw new Error(`Napaka: ${error.message}`)
    return data
  },

  async get_market_price_range(input) {
    const { work_description } = input as { work_description: string }
    const { data, error } = await supabaseAdmin
      .from('ponudbe')
      .select('price_estimate')
      .eq('status', 'accepted')
      .limit(50)

    if (error || !data?.length) {
      return { min: null, max: null, sample_size: 0 }
    }

    const prices = data.map((d) => d.price_estimate).sort((a, b) => a - b)
    return {
      min: prices[0],
      max: prices[prices.length - 1],
      median: prices[Math.floor(prices.length / 2)],
      sample_size: prices.length,
    }
  },

  async execute_code_in_sandbox(input) {
    const { code, language = 'python' } = input as { code: string; language?: 'python' | 'javascript' }
    const { runInE2B } = await import('./e2b')
    return runInE2B(code, language)
  },

  async edit_file_fastapply(input) {
    const morph = await getMorphFastApplyTool()
    if (!morph) {
      throw new Error('Morph FastApply ni na voljo. Nastavi MORPH_API_KEY in namesti @morphllm/morphsdk.')
    }

    const payload = input as {
      target_filepath?: string
      instructions?: string
      code_edit?: string
      filePath?: string
      instruction?: string
    }

    const normalized = {
      target_filepath: payload.target_filepath ?? payload.filePath,
      instructions: payload.instructions ?? payload.instruction,
      code_edit: payload.code_edit,
    }

    if (!normalized.target_filepath || !normalized.instructions || !normalized.code_edit) {
      throw new Error('FastApply zahteva: target_filepath, instructions, code_edit')
    }

    return morph.run(normalized)
  },

  async find_matching_obrtniki(input) {
    const { category_id, location, limit = 10 } = input as {
      category_id: string
      location?: string
      limit?: number
    }

    const { data, error } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, avg_rating')
      .order('avg_rating', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Napaka: ${error.message}`)
    return data
  },
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolResultBlockParam> {
  const handler = TOOL_HANDLERS[toolName]

  if (!handler) {
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify({ error: `Neznano orodje: ${toolName}` }),
      is_error: true,
    }
  }

  try {
    const result = await handler(toolInput)
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify(result),
      is_error: false,
    }
  } catch (error) {
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify({
        error: error instanceof Error ? error.message : 'Neznana napaka',
      }),
      is_error: true,
    }
  }
}

export function getToolsForAgent(agentType: string): Tool[] {
  const agentTools: Record<string, string[]> = {
    onboarding_assistant: ['search_similar_tasks', 'get_market_price_range'],
    provider_coach: ['search_similar_tasks', 'get_market_price_range', 'find_matching_obrtniki'],
    payment_helper: ['get_task_details'],
    support_agent: ['search_similar_tasks', 'get_task_details', 'execute_code_in_sandbox', 'edit_file_fastapply'],

    // Legacy aliases during migration
    work_description: ['search_similar_tasks', 'get_market_price_range'],
    offer_comparison: ['get_market_price_range'],
    scheduling_assistant: ['find_matching_obrtniki'],
    general_chat: ['search_similar_tasks'],
    default: ['search_similar_tasks', 'execute_code_in_sandbox'],
  }

  const toolNames = agentTools[agentType] || agentTools.default
  return AI_TOOLS.filter((t) => toolNames.includes(t.name))
}
