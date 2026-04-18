'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type UsageData = {
  subscription_tier: string
  ai_messages_used_today: number
  ai_messages_reset_at: string
  ai_total_tokens_used: number
  ai_total_cost_usd: number
}

const TIER_LIMITS: Record<string, number | null> = {
  start: 5,
  pro: 100,
  enterprise: null,
}

const TIER_LABELS: Record<string, string> = {
  start: 'START (brezplačen)',
  pro: 'PRO',
  enterprise: 'Enterprise',
}

export function AIUsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier, ai_messages_used_today, ai_messages_reset_at, ai_total_tokens_used, ai_total_cost_usd')
        .eq('id', user.id)
        .maybeSingle()

      if (data) setUsage(data as UsageData)
      setLoading(false)
    }
    fetchUsage()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-2 w-full bg-gray-200 rounded" />
      </div>
    )
  }

  if (!usage) return null

  const tier = usage.subscription_tier ?? 'start'
  const limit = TIER_LIMITS[tier]
  const used = usage.ai_messages_used_today ?? 0
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0
  const resetAt = usage.ai_messages_reset_at ? new Date(usage.ai_messages_reset_at) : null
  const resetInMs = resetAt ? resetAt.getTime() + 24 * 60 * 60 * 1000 - Date.now() : 0
  const resetInHours = Math.max(0, Math.floor(resetInMs / (1000 * 60 * 60)))

  const barColor =
    pct >= 100 ? 'bg-red-500' :
    pct >= 80 ? 'bg-amber-500' :
    'bg-blue-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">AI Asistent – Dnevna uporaba</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
          {TIER_LABELS[tier] ?? tier}
        </span>
      </div>

      {limit !== null ? (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{used} / {limit} sporočil danes</span>
              {resetInHours > 0 && <span>Ponastavitev čez ~{resetInHours}h</span>}
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {pct >= 100 && (
            <p className="text-xs text-red-600 font-medium">
              Dnevni limit dosežen.{' '}
              {tier === 'start' && (
                <a href="/narocnina" className="underline hover:text-red-800">
                  Nadgradite na PRO
                </a>
              )}
            </p>
          )}
          {tier === 'start' && pct < 100 && (
            <div className="pt-2 border-t border-gray-100 mt-1">
              <p className="text-xs text-gray-500">
                START: 5 sporočil/dan • PRO: 100/dan + AI Generator, Materiali, Video{' '}
                <a href="/narocnina" className="underline text-blue-600 hover:text-blue-800">
                  Primerjaj →
                </a>
              </p>
            </div>
          )}
          {pct >= 80 && pct < 100 && (
            <p className="text-xs text-amber-600">
              Skoraj pri limitu. Ostane vam {limit - used} sporočil.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500">Neomejeno sporočil (Enterprise)</p>
      )}

      <div className="pt-1 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="block text-gray-400">Skupaj tokenov</span>
          <span className="font-medium text-gray-700">
            {(usage.ai_total_tokens_used ?? 0).toLocaleString('sl-SI')}
          </span>
        </div>
        <div>
          <span className="block text-gray-400">Skupaj strošek</span>
          <span className="font-medium text-gray-700">
            ${Number(usage.ai_total_cost_usd ?? 0).toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  )
}
