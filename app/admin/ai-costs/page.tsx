import { supabaseAdmin } from '@/lib/supabase-admin'
import { AiCostsDashboard } from './AiCostsDashboard'

export const metadata = { title: 'AI Stroški Agentov | Admin' }
export const revalidate = 300

async function getCostData(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [byAgentRes, byDayRes, byModelRes, topUsersRes, summaryRes] = await Promise.all([
    supabaseAdmin
      .from('agent_token_usage')
      .select('agent_name, total_tokens, cost_usd')
      .gte('created_at', since),
    supabaseAdmin
      .from('agent_token_usage')
      .select('created_at, total_tokens, cost_usd')
      .gte('created_at', since)
      .order('created_at'),
    supabaseAdmin
      .from('agent_token_usage')
      .select('model, total_tokens, cost_usd')
      .gte('created_at', since),
    supabaseAdmin
      .from('agent_token_usage')
      .select('user_id, total_tokens, cost_usd')
      .gte('created_at', since),
    supabaseAdmin
      .from('agent_token_usage')
      .select('total_tokens, cost_usd, input_tokens, output_tokens'),
  ])

  const agentMap: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const r of byAgentRes.data ?? []) {
    if (!agentMap[r.agent_name]) agentMap[r.agent_name] = { tokens: 0, cost: 0, calls: 0 }
    agentMap[r.agent_name].tokens += r.total_tokens
    agentMap[r.agent_name].cost += Number(r.cost_usd ?? 0)
    agentMap[r.agent_name].calls++
  }

  const dayMap: Record<string, { tokens: number; cost: number }> = {}
  for (const r of byDayRes.data ?? []) {
    const d = r.created_at.slice(0, 10)
    if (!dayMap[d]) dayMap[d] = { tokens: 0, cost: 0 }
    dayMap[d].tokens += r.total_tokens
    dayMap[d].cost += Number(r.cost_usd ?? 0)
  }

  const modelMap: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const r of byModelRes.data ?? []) {
    if (!modelMap[r.model]) modelMap[r.model] = { tokens: 0, cost: 0, calls: 0 }
    modelMap[r.model].tokens += r.total_tokens
    modelMap[r.model].cost += Number(r.cost_usd ?? 0)
    modelMap[r.model].calls++
  }

  const userMap: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const r of topUsersRes.data ?? []) {
    if (!userMap[r.user_id]) userMap[r.user_id] = { tokens: 0, cost: 0, calls: 0 }
    userMap[r.user_id].tokens += r.total_tokens
    userMap[r.user_id].cost += Number(r.cost_usd ?? 0)
    userMap[r.user_id].calls++
  }

  const all = summaryRes.data ?? []
  const totalTokens = all.reduce((s, r) => s + r.total_tokens, 0)
  const totalCost = all.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)

  return {
    summary: {
      totalTokens,
      totalCost,
      totalCalls: all.length,
      totalInput: all.reduce((s, r) => s + r.input_tokens, 0),
      totalOutput: all.reduce((s, r) => s + r.output_tokens, 0),
    },
    byAgent: Object.entries(agentMap).map(([agent, v]) => ({ agent, ...v })),
    dailyTotals: Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byModel: Object.entries(modelMap).map(([model, v]) => ({ model, ...v })),
    topUsers: Object.entries(userMap)
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10),
    periodDays: days,
  }
}

export default async function AiCostsPage() {
  const data = await getCostData(30)
  return <AiCostsDashboard data={data} />
}
