'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Metrics {
  totalToolCalls: number
  guardrailRejections: number
  activeAlerts: number
  avgDuration: number
}

export function MetricsBar() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<Metrics>({
    totalToolCalls: 0,
    guardrailRejections: 0,
    activeAlerts: 0,
    avgDuration: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      // Get tool calls and rejections from today
      const today = new Date().toISOString().split('T')[0]
      const { data: logs, error: logsError } = await supabase
        .from('agent_logs')
        .select('event, duration_ms')
        .gte('created_at', today)

      if (logsError) throw logsError

      const toolCalls = logs?.filter(l => l.event === 'tool_executed').length || 0
      const rejections = logs?.filter(l => l.event?.includes('rejected')).length || 0
      const durations = logs?.filter(l => l.duration_ms).map(l => l.duration_ms) || []
      const avgDuration = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0

      // Get active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('agent_alerts')
        .select('id')
        .eq('resolved', false)

      if (alertsError) throw alertsError

      setMetrics({
        totalToolCalls: toolCalls,
        guardrailRejections: rejections,
        activeAlerts: alerts?.length || 0,
        avgDuration,
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [supabase])

  const cards = [
    { label: 'Tool Calls (Today)', value: metrics.totalToolCalls, color: 'bg-blue-900' },
    { label: 'Guardrail Rejections', value: metrics.guardrailRejections, color: 'bg-orange-900' },
    { label: 'Active Alerts', value: metrics.activeAlerts, color: 'bg-red-900' },
    { label: 'Avg Duration (ms)', value: metrics.avgDuration, color: 'bg-green-900' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} rounded-lg p-6 text-white`}
        >
          <div className="text-sm text-slate-300 mb-2">{card.label}</div>
          <div className="text-3xl font-bold">{isLoading ? '-' : card.value}</div>
        </div>
      ))}
    </div>
  )
}
