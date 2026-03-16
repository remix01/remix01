'use client'

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type RawLog = {
  created_at: string
  model_used: string
  cost_usd: number
  input_tokens?: number
  output_tokens?: number
  response_cached: boolean
}

type ModelLog = { model_used: string }
type UserLog = { user_id: string; cost_usd: number }
type SummaryLog = { cost_usd: number; response_cached: boolean; model_used: string }

type Props = {
  data: {
    rawLogs: RawLog[]
    modelLogs24h: ModelLog[]
    userLogs7d: UserLog[]
    summaryLogs24h: SummaryLog[]
  }
}

const MODEL_COLORS: Record<string, string> = {
  'claude-haiku-4-5-20251001': '#3b82f6',
  'claude-sonnet-4-6': '#8b5cf6',
  cached: '#10b981',
}

function buildDailyData(logs: RawLog[]) {
  const byDay: Record<string, { date: string; cost: number; messages: number; cached: number }> = {}
  for (const log of logs) {
    const date = log.created_at.slice(0, 10)
    if (!byDay[date]) byDay[date] = { date, cost: 0, messages: 0, cached: 0 }
    byDay[date].cost += Number(log.cost_usd ?? 0)
    byDay[date].messages += 1
    if (log.response_cached) byDay[date].cached += 1
  }
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
}

function buildModelPie(logs: ModelLog[]) {
  const counts: Record<string, number> = {}
  for (const log of logs) {
    const key = log.model_used
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

function buildTopUsers(logs: UserLog[]) {
  const byUser: Record<string, { user_id: string; messages: number; cost: number }> = {}
  for (const log of logs) {
    if (!byUser[log.user_id]) byUser[log.user_id] = { user_id: log.user_id, messages: 0, cost: 0 }
    byUser[log.user_id].messages += 1
    byUser[log.user_id].cost += Number(log.cost_usd ?? 0)
  }
  return Object.values(byUser)
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 10)
}

export function AIAnalyticsDashboard({ data }: Props) {
  const dailyData = buildDailyData(data.rawLogs)
  const modelPie = buildModelPie(data.modelLogs24h)
  const topUsers = buildTopUsers(data.userLogs7d)

  const totalCost24h = data.summaryLogs24h.reduce((s, l) => s + Number(l.cost_usd ?? 0), 0)
  const totalMessages24h = data.summaryLogs24h.length
  const cacheRate = totalMessages24h > 0
    ? Math.round(data.summaryLogs24h.filter(l => l.response_cached).length * 100 / totalMessages24h)
    : 0
  const haiku24h = data.summaryLogs24h.filter(l => l.model_used.includes('haiku')).length
  const haikuRate = totalMessages24h > 0 ? Math.round(haiku24h * 100 / totalMessages24h) : 0

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">AI Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Strošek danes" value={`$${totalCost24h.toFixed(4)}`} />
        <StatCard label="Sporočil danes" value={String(totalMessages24h)} />
        <StatCard label="Cache hit rate" value={`${cacheRate}%`} target="≥70%" ok={cacheRate >= 70} />
        <StatCard label="Haiku routing" value={`${haikuRate}%`} target="≥80%" ok={haikuRate >= 80} />
      </div>

      {/* Daily cost chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Dnevni strošek (7 dni)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v.toFixed(3)}`} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Strošek']} />
            <Legend />
            <Line type="monotone" dataKey="cost" name="Strošek ($)" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="messages" name="Sporočila" stroke="#10b981" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Model distribucija (24h)</h2>
          {modelPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modelPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {modelPie.map((entry, i) => (
                    <Cell key={i} fill={MODEL_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Ni podatkov</p>
          )}
        </div>

        {/* Top users */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top 10 uporabnikov (7 dni)</h2>
          {topUsers.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2">User ID</th>
                    <th className="text-right pb-2">Sporočila</th>
                    <th className="text-right pb-2">Strošek</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map(u => (
                    <tr key={u.user_id} className="border-b border-gray-50">
                      <td className="py-1 font-mono text-gray-600">{u.user_id.slice(0, 8)}…</td>
                      <td className="py-1 text-right text-gray-700">{u.messages}</td>
                      <td className="py-1 text-right text-gray-700">${u.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Ni podatkov</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  target,
  ok,
}: {
  label: string
  value: string
  target?: string
  ok?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {target && (
        <p className={`text-xs mt-1 ${ok ? 'text-green-600' : 'text-amber-600'}`}>
          Cilj: {target}
        </p>
      )}
    </div>
  )
}
