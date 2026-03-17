'use client'

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: {
    summary: {
      totalTokens: number
      totalCost: number
      totalCalls: number
      totalInput: number
      totalOutput: number
    }
    byAgent: { agent: string; tokens: number; cost: number; calls: number }[]
    dailyTotals: { date: string; tokens: number; cost: number }[]
    byModel: { model: string; tokens: number; cost: number; calls: number }[]
    topUsers: { userId: string; tokens: number; cost: number; calls: number }[]
    periodDays: number
  }
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316']

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtAgent(a: string) {
  return a.replace(/-/g, ' ').replace(/_/g, ' ')
}

export function AiCostsDashboard({ data }: Props) {
  const { summary, byAgent, dailyTotals, byModel, topUsers, periodDays } = data

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">AI Stroški Agentov</h1>
        <p className="text-sm text-gray-500 mt-1">
          Skupaj vsi časi · Grafikon zadnjih {periodDays} dni
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Skupaj klici" value={summary.totalCalls.toLocaleString()} />
        <KPI label="Skupaj tokeni" value={fmtTokens(summary.totalTokens)} sub={`${fmtTokens(summary.totalInput)} in / ${fmtTokens(summary.totalOutput)} out`} />
        <KPI label="Skupaj strošek" value={`$${summary.totalCost.toFixed(4)}`} />
        <KPI label="Povp. strošek/klic" value={summary.totalCalls ? `$${(summary.totalCost / summary.totalCalls).toFixed(5)}` : '–'} />
        <KPI label="Povp. tokenov/klic" value={summary.totalCalls ? fmtTokens(Math.round(summary.totalTokens / summary.totalCalls)) : '–'} />
      </div>

      {/* Daily cost line chart */}
      {dailyTotals.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-4">Dnevni stroški (zadnjih {periodDays} dni)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="cost" orientation="left" tickFormatter={v => `$${Number(v).toFixed(3)}`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="tokens" orientation="right" tickFormatter={v => fmtTokens(Number(v))} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => name === 'cost' ? [`$${Number(v).toFixed(5)}`, 'Strošek'] : [fmtTokens(Number(v)), 'Tokeni']} />
              <Legend />
              <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="#3b82f6" name="Strošek $" dot={false} />
              <Line yAxisId="tokens" type="monotone" dataKey="tokens" stroke="#10b981" name="Tokeni" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By agent bar chart */}
        {byAgent.length > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-4">Poraba po agentih (zadnjih {periodDays} dni)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byAgent.sort((a, b) => b.tokens - a.tokens)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => fmtTokens(Number(v))} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="agent" tickFormatter={fmtAgent} width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === 'tokens' ? [fmtTokens(Number(v)), 'Tokeni'] : [v, 'Klici']} />
                <Legend />
                <Bar dataKey="tokens" fill="#3b82f6" name="Tokeni" />
                <Bar dataKey="calls" fill="#10b981" name="Klici" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By model pie */}
        {byModel.length > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-4">Porazdelitev po modelu</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byModel}
                  dataKey="tokens"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${(name as string).split('-').slice(-1)[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {byModel.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [fmtTokens(Number(v)), name as string]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top users table */}
      {topUsers.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-3">Top 10 uporabnikov po porabi tokenov</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">User ID</th>
                  <th className="pb-2 pr-4 text-right">Tokeni</th>
                  <th className="pb-2 pr-4 text-right">Klici</th>
                  <th className="pb-2 text-right">Strošek</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u, i) => (
                  <tr key={u.userId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{u.userId.slice(0, 8)}…</td>
                    <td className="py-2 pr-4 text-right">{fmtTokens(u.tokens)}</td>
                    <td className="py-2 pr-4 text-right">{u.calls}</td>
                    <td className="py-2 text-right text-blue-600">${u.cost.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.totalCalls === 0 && (
        <div className="bg-gray-50 border rounded-xl p-12 text-center text-gray-400">
          Ni podatkov o porabi agentov.
        </div>
      )}
    </div>
  )
}
