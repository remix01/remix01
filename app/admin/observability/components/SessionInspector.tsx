'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SessionLog {
  id: string
  created_at: string
  event: string
  tool: string | null
  params: Record<string, any> | null
  result: string | null
  duration_ms: number | null
}

function sanitizeParams(params: Record<string, any> | null): Record<string, any> | null {
  if (!params) return null

  const sanitized = { ...params }
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apikey', 'payment', 'card', 'cvv']

  const sanitizeRecursive = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj

    if (Array.isArray(obj)) {
      return obj.map(sanitizeRecursive)
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = sanitizeRecursive(value)
      }
    }
    return result
  }

  return sanitizeRecursive(sanitized)
}

export function SessionInspector() {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setLogs([])
      setSearchPerformed(false)
      return
    }

    setIsLoading(true)
    try {
      // Try to fetch by session_id or user_id
      let query = supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: true })

      // Check if query is a UUID-like session ID or user ID
      if (searchQuery.includes('-') || searchQuery.length === 36) {
        query = query.or(`session_id.eq.${searchQuery},user_id.eq.${searchQuery}`)
      } else {
        // Assume it's a partial session/user ID
        query = query.or(`session_id.ilike.%${searchQuery}%,user_id.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      setLogs(data || [])
      setSearchPerformed(true)
    } catch (error) {
      console.error('Error searching logs:', error)
      setLogs([])
      setSearchPerformed(true)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Session Inspector</h2>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter sessionId or userId to inspect..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 px-6 py-2 rounded font-semibold text-white transition"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchPerformed && logs.length === 0 && (
        <div className="text-center text-slate-400 py-8">No logs found for this query</div>
      )}

      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-300">Time</th>
                <th className="text-left py-2 px-3 text-slate-300">Event</th>
                <th className="text-left py-2 px-3 text-slate-300">Tool</th>
                <th className="text-left py-2 px-3 text-slate-300">Params</th>
                <th className="text-left py-2 px-3 text-slate-300">Result</th>
                <th className="text-left py-2 px-3 text-slate-300">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const sanitized = sanitizeParams(log.params)
                return (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{formatTime(log.created_at)}</td>
                    <td className="py-2 px-3 text-slate-300">{log.event}</td>
                    <td className="py-2 px-3 text-slate-400">{log.tool || '-'}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono max-w-xs truncate" title={JSON.stringify(sanitized)}>
                      {sanitized ? JSON.stringify(sanitized).slice(0, 50) : '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{log.result || '-'}</td>
                    <td className="py-2 px-3 text-slate-400">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
