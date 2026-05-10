/**
 * AI Tools Module for LiftGO
 *
 * Defines tools that AI agents can use via function calling.
 */

import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

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
    support_agent: ['search_similar_tasks', 'get_task_details'],

    // Legacy aliases during migration
    work_description: ['search_similar_tasks', 'get_market_price_range'],
    offer_comparison: ['get_market_price_range'],
    scheduling_assistant: ['find_matching_obrtniki'],
    general_chat: ['search_similar_tasks'],
    default: ['search_similar_tasks'],
  }

  const toolNames = agentTools[agentType] || agentTools.default
  return AI_TOOLS.filter((t) => toolNames.includes(t.name))
}
