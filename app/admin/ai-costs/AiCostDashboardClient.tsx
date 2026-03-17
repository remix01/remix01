'use client'

import { useRouter } from 'next/navigation'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const AGENT_TYPE_LABELS: Record<string, string> = {
  general_chat: 'Splošni chat',
  work_description: 'Opis dela',
  offer_comparison: 'Primerjava',
  scheduling_assistant: 'Urnik',
  video_diagnosis: 'Video diagnoza',
  quote_generator: 'Generator ponudb',
  materials_agent: 'Materiali',
  job_summary: 'Povzetek',
  offer_writing: 'Pisanje ponudb',
  profile_optimization: 'Optimizacija'
}

interface AiCostData {
  total_cost: number
  total_messages: number
  total_tokens: number
  today_cost: number
  today_messages: number
  by_agent: Record<string, { messages: number; tokens: number; cost: number }>
  by_day: Array<{ date: string; agent_type: string; messages: number; tokens_in: number; tokens_out: number; cost_usd: number }>
  recent_jobs: Array<{
    id: string
    agent_type: string
    job_type: string
    status: string
    cost_usd: number
    tokens_input: number
    tokens_output: number
    queued_at: string
    completed_at: string | null
    error_message: string | null
  }>
  failed_count: number
  days: number
}

interface AiCostDashboardClientProps {
  data: AiCostData
}

export function AiCostDashboardClient({ data }: AiCostDashboardClientProps) {
  const router = useRouter()

  const handleRangeChange = (days: number) => {
    const range = days === 7 ? '7' : days === 90 ? '90' : '30'
    router.push(`/admin/ai-costs?range=${range}`)
  }

  // Aggregate data by day for line chart
  const costByDay = data.by_day.reduce(
    (acc, row) => {
      const existing = acc.find(d => d.date === row.date)
      if (existing) {
        existing.cost_usd += row.cost_usd
      } else {
        acc.push({ date: row.date, cost_usd: row.cost_usd })
      }
      return acc
    },
    [] as Array<{ date: string; cost_usd: number }>
  )

  // Prepare agent cost data for bar chart
  const agentCostData = Object.entries(data.by_agent).map(([agent, stats]) => ({
    name: AGENT_TYPE_LABELS[agent] || agent,
    cost: stats.cost
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('sl-SI')
  }

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleRangeChange(7)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            data.days === 7
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          7 dni
        </button>
        <button
          onClick={() => handleRangeChange(30)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            data.days === 30
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          30 dni
        </button>
        <button
          onClick={() => handleRangeChange(90)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            data.days === 90
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          90 dni
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground font-medium">Skupni stroški</p>
          <p className="text-2xl font-bold text-foreground mt-2">${data.total_cost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">v zadnjih {data.days} dneh</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground font-medium">Danes</p>
          <p className="text-2xl font-bold text-foreground mt-2">${data.today_cost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.today_messages} sporočil</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground font-medium">Skupni tokeni</p>
          <p className="text-2xl font-bold text-foreground mt-2">{data.total_tokens.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">vhod + izhod</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground font-medium">Neuspešne naloge</p>
          <p className="text-2xl font-bold text-destructive mt-2">{data.failed_count}</p>
          <p className="text-xs text-muted-foreground mt-1">v zadnjih {data.days} dneh</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Stroški po dnu</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="currentColor" />
              <YAxis stroke="currentColor" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Line type="monotone" dataKey="cost_usd" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Stroški po agentu</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentCostData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="currentColor" />
              <YAxis dataKey="name" type="category" stroke="currentColor" width={150} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="cost" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Nedavne naloge</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground">
                <th className="text-left py-2 px-4 font-medium">Agent</th>
                <th className="text-left py-2 px-4 font-medium">Tip</th>
                <th className="text-left py-2 px-4 font-medium">Status</th>
                <th className="text-right py-2 px-4 font-medium">Tokeni</th>
                <th className="text-right py-2 px-4 font-medium">Stroški</th>
                <th className="text-left py-2 px-4 font-medium">Čas</th>
                <th className="text-left py-2 px-4 font-medium">Napaka</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recent_jobs.map(job => (
                <tr key={job.id} className="hover:bg-muted/50">
                  <td className="py-3 px-4 text-foreground">{AGENT_TYPE_LABELS[job.agent_type] || job.agent_type}</td>
                  <td className="py-3 px-4 text-foreground text-xs">{job.job_type}</td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">{(job.tokens_input + job.tokens_output).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-foreground font-medium">${job.cost_usd.toFixed(4)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{formatTime(job.queued_at)}</td>
                  <td className="py-3 px-4 text-destructive text-xs max-w-xs truncate" title={job.error_message || undefined}>
                    {job.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
