'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ActivityLog {
  id: string
  created_at: string
  user_id: string
  event: string
  tool: string | null
  result: 'success' | 'error' | 'warning' | null
  duration_ms: number | null
}

type FilterType = 'all' | 'errors' | 'guardrails' | 'permissions' | 'state_machine'

export function ActivityFeed() {
  const supabase = createClient()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter === 'errors') {
        query = query.eq('result', 'error')
      } else if (filter === 'guardrails') {
        query = query.like('event', '%guard%')
      } else if (filter === 'permissions') {
        query = query.like('event', '%permission%')
      } else if (filter === 'state_machine') {
        query = query.like('event', '%state%')
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [filter, supabase])

  const filters: FilterType[] = ['all', 'errors', 'guardrails', 'permissions', 'state_machine']

  const getResultColor = (result: string | null) => {
    if (result === 'success') return 'text-green-400'
    if (result === 'error') return 'text-red-400'
    if (result === 'warning') return 'text-yellow-400'
    return 'text-slate-400'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Activity Feed</h2>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm transition ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-300">Time</th>
                <th className="text-left py-2 px-3 text-slate-300">User</th>
                <th className="text-left py-2 px-3 text-slate-300">Event</th>
                <th className="text-left py-2 px-3 text-slate-300">Tool</th>
                <th className="text-left py-2 px-3 text-slate-300">Result</th>
                <th className="text-left py-2 px-3 text-slate-300">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">No logs found</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 px-3 text-slate-300">{formatTime(log.created_at)}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-xs">{log.user_id?.slice(0, 8)}...</td>
                    <td className="py-2 px-3 text-slate-300">{log.event}</td>
                    <td className="py-2 px-3 text-slate-400">{log.tool || '-'}</td>
                    <td className={`py-2 px-3 font-semibold ${getResultColor(log.result)}`}>
                      {log.result === 'success' ? '✅' : log.result === 'error' ? '❌' : log.result === 'warning' ? '⚠️' : '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
