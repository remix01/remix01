'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  user_id: string | null
  details: string
  created_at: string
  resolved: boolean
}

export function AlertsPanel() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000)
    return () => clearInterval(interval)
  }, [supabase])

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('agent_alerts')
        .update({ resolved: true })
        .eq('id', alertId)

      if (error) throw error
      setAlerts(alerts.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900 text-red-200'
      case 'high':
        return 'bg-orange-900 text-orange-200'
      case 'medium':
        return 'bg-yellow-900 text-yellow-200'
      case 'low':
        return 'bg-blue-900 text-blue-200'
      default:
        return 'bg-slate-800 text-slate-200'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return created.toLocaleDateString()
  }

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700 h-full">
      <h2 className="text-xl font-bold text-white mb-4">Active Alerts</h2>

      {isLoading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center text-green-400 py-8 font-semibold">No active alerts</div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="bg-slate-800 rounded p-3 space-y-2 border-l-4 border-slate-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-1 ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </div>
                  <div className="text-sm text-slate-300 font-semibold">{alert.type}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {alert.user_id ? `User: ${alert.user_id.slice(0, 8)}...` : 'System-wide'}
                  </div>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded transition"
                >
                  Resolve
                </button>
              </div>
              <div className="text-xs text-slate-400">{alert.details}</div>
              <div className="text-xs text-slate-500">{formatTimeAgo(alert.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
