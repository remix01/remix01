/**
 * Admin Agent Costs API
 *
 * Returns aggregated token usage and cost data from agent_token_usage.
 * Used by /admin/ai-costs dashboard.
 */

import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30', 10)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: byAgent },
    { data: byDay },
    { data: byModel },
    { data: topUsers },
    { data: summary },
  ] = await Promise.all([
    // Totals by agent name
    supabaseAdmin
      .from('agent_token_usage')
      .select('agent_name, total_tokens, cost_usd')
      .gte('created_at', since),

    // Daily totals
    supabaseAdmin
      .from('agent_token_usage')
      .select('created_at, total_tokens, cost_usd')
      .gte('created_at', since)
      .order('created_at'),

    // By model
    supabaseAdmin
      .from('agent_token_usage')
      .select('model, total_tokens, cost_usd')
      .gte('created_at', since),

    // Top users by token usage
    supabaseAdmin
      .from('agent_token_usage')
      .select('user_id, total_tokens, cost_usd')
      .gte('created_at', since)
      .order('total_tokens', { ascending: false })
      .limit(20),

    // Overall summary (all time)
    supabaseAdmin
      .from('agent_token_usage')
      .select('total_tokens, cost_usd, input_tokens, output_tokens'),
  ])

  // Aggregate by agent
  const agentTotals: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const row of byAgent ?? []) {
    if (!agentTotals[row.agent_name]) {
      agentTotals[row.agent_name] = { tokens: 0, cost: 0, calls: 0 }
    }
    agentTotals[row.agent_name].tokens += row.total_tokens
    agentTotals[row.agent_name].cost += Number(row.cost_usd ?? 0)
    agentTotals[row.agent_name].calls++
  }

  // Aggregate by day (YYYY-MM-DD)
  const dayMap: Record<string, { tokens: number; cost: number }> = {}
  for (const row of byDay ?? []) {
    const day = row.created_at.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { tokens: 0, cost: 0 }
    dayMap[day].tokens += row.total_tokens
    dayMap[day].cost += Number(row.cost_usd ?? 0)
  }
  const dailyTotals = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }))

  // Aggregate by model
  const modelMap: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const row of byModel ?? []) {
    if (!modelMap[row.model]) modelMap[row.model] = { tokens: 0, cost: 0, calls: 0 }
    modelMap[row.model].tokens += row.total_tokens
    modelMap[row.model].cost += Number(row.cost_usd ?? 0)
    modelMap[row.model].calls++
  }

  // Aggregate top users
  const userMap: Record<string, { tokens: number; cost: number; calls: number }> = {}
  for (const row of topUsers ?? []) {
    if (!userMap[row.user_id]) userMap[row.user_id] = { tokens: 0, cost: 0, calls: 0 }
    userMap[row.user_id].tokens += row.total_tokens
    userMap[row.user_id].cost += Number(row.cost_usd ?? 0)
    userMap[row.user_id].calls++
  }
  const topUsersList = Object.entries(userMap)
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10)

  // Overall summary
  const totalTokens = (summary ?? []).reduce((s, r) => s + r.total_tokens, 0)
  const totalCost = (summary ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  const totalInput = (summary ?? []).reduce((s, r) => s + r.input_tokens, 0)
  const totalOutput = (summary ?? []).reduce((s, r) => s + r.output_tokens, 0)

  return NextResponse.json({
    summary: {
      totalTokens,
      totalCost: totalCost.toFixed(4),
      totalInput,
      totalOutput,
      totalCalls: summary?.length ?? 0,
    },
    byAgent: Object.entries(agentTotals).map(([agent, v]) => ({ agent, ...v })),
    dailyTotals,
    byModel: Object.entries(modelMap).map(([model, v]) => ({ model, ...v })),
    topUsers: topUsersList,
    periodDays: days,
  })
}
