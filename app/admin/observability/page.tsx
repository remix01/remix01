'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MetricsBar } from './components/MetricsBar'
import { ActivityFeed } from './components/ActivityFeed'
import { AlertsPanel } from './components/AlertsPanel'
import { SessionInspector } from './components/SessionInspector'

export default function ObservabilityPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/prijava')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">Agent Observability</h1>
          <p className="text-slate-400">Real-time monitoring of AI agent activity, alerts, and metrics</p>
        </div>

        <MetricsBar />

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            <ActivityFeed />
          </div>

          <div className="col-span-1">
            <AlertsPanel />
          </div>
        </div>

        <SessionInspector />
      </div>
    </div>
  )
}
