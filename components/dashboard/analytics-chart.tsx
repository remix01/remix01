'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsChartProps {
  data: any[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const categoryData = useMemo(() => {
    const grouped = data.reduce(
      (acc, item) => {
        const category = item.category || 'Ostalo'
        const existing = acc.find((g) => g.name === category)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({ name: category, value: 1 })
        }
        return acc
      },
      [] as { name: string; value: number }[]
    )
    return grouped
  }, [data])

  const statusData = useMemo(() => {
    const statuses = {
      'V teku': 0,
      'Končano': 0,
      'Opuščeno': 0,
    }
    data.forEach((item) => {
      if (item.status === 'pending') statuses['V teku']++
      else if (item.status === 'completed') statuses['Končano']++
      else if (item.status === 'cancelled') statuses['Opuščeno']++
    })
    return Object.entries(statuses).map(([name, value]) => ({ name, value }))
  }, [data])

  const colors = ['#0a9172', '#f97316', '#ef4444']

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Podatki po kategoriji
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#0a9172" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Distribucija statusa
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {colors.map((color, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
