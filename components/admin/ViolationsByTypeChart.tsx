'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ViolationsByTypeChartProps {
  data: Record<string, number>
}

const typeLabels: Record<string, string> = {
  PHONE_DETECTED: 'Phone',
  EMAIL_DETECTED: 'Email',
  BYPASS_ATTEMPT: 'Bypass',
  SUSPICIOUS_PATTERN: 'Suspicious'
}

export function ViolationsByTypeChart({ data }: ViolationsByTypeChartProps) {
  const chartData = Object.entries(data).map(([type, count]) => ({
    type: typeLabels[type] || type,
    count
  }))

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Violations by Type
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="type" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="count" 
            fill="hsl(var(--primary))"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
