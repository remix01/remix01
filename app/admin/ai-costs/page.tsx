import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AiCostDashboardClient } from './AiCostDashboardClient'

export default async function AiCostsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const sp = await searchParams
  const days = sp.range === '7' ? 7 : sp.range === '90' ? 90 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceISO = since.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [{ data: totals }, { data: todayData }, { data: byDay }, { data: recentJobs }, { count: failedCount }] =
    await Promise.all([
      supabaseAdmin.from('agent_cost_summary' as any).select('agent_type,messages,tokens_in,tokens_out,cost_usd').gte('date', sinceISO),
      supabaseAdmin.from('agent_cost_summary' as any).select('agent_type,messages,cost_usd').eq('date', today),
      supabaseAdmin.from('agent_cost_summary' as any).select('date,agent_type,messages,tokens_in,tokens_out,cost_usd').gte('date', sinceISO).order('date', { ascending: true }),
      supabaseAdmin.from('agent_jobs').select('id,agent_type,job_type,status,cost_usd,tokens_input,tokens_output,queued_at,completed_at,error_message').gte('queued_at', since.toISOString()).order('queued_at', { ascending: false }).limit(50),
      supabaseAdmin.from('agent_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('queued_at', since.toISOString()),
    ])

  const byAgent: Record<string, { messages: number; tokens: number; cost: number }> = {}
  for (const row of (totals as any[]) ?? []) {
    if (!byAgent[row.agent_type]) byAgent[row.agent_type] = { messages: 0, tokens: 0, cost: 0 }
    byAgent[row.agent_type].messages += Number(row.messages)
    byAgent[row.agent_type].tokens += Number(row.tokens_in) + Number(row.tokens_out)
    byAgent[row.agent_type].cost += Number(row.cost_usd)
  }

  const allRows = (totals as any[]) ?? []
  const data = {
    total_cost: allRows.reduce((s, r) => s + Number(r.cost_usd), 0),
    total_messages: allRows.reduce((s, r) => s + Number(r.messages), 0),
    total_tokens: allRows.reduce((s, r) => s + Number(r.tokens_in) + Number(r.tokens_out), 0),
    today_cost: ((todayData as any[]) ?? []).reduce((s, r) => s + Number(r.cost_usd), 0),
    today_messages: ((todayData as any[]) ?? []).reduce((s, r) => s + Number(r.messages), 0),
    by_agent: byAgent,
    by_day: byDay ?? [],
    recent_jobs: recentJobs ?? [],
    failed_count: failedCount ?? 0,
    days,
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Stroški agentov</h1>
        <p className="text-sm text-muted-foreground mt-1">Poraba tokenov in stroški po agentu, modelu in naročniškem paketu</p>
      </div>
      <AiCostDashboardClient data={data} />
    </div>
  )
}
