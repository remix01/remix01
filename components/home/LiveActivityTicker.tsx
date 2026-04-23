'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import type { HomeActivityItem } from './types'

interface LiveActivityTickerProps {
  initialItems: HomeActivityItem[]
}

interface PovprasevanjeInsertPayload {
  id: string
  location_city: string | null
  kategorija: string | null
  created_at: string
}

interface ActivityApiResponse {
  items?: HomeActivityItem[]
}

const ACTIVITY_POLL_INTERVAL_MS = 12000

export function LiveActivityTicker({ initialItems }: LiveActivityTickerProps) {
  const [items, setItems] = useState<HomeActivityItem[]>(initialItems)

  const fallbackText = useMemo(
    () => 'Pravkar: stranke po Sloveniji oddajajo nova povpraševanja.',
    []
  )

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch('/api/home/activity', { cache: 'no-store' })
        if (!response.ok) return

        const data = (await response.json()) as ActivityApiResponse
        if (Array.isArray(data.items)) {
          setItems(data.items)
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[LiveActivityTicker] Failed to refresh activity', error)
        }
      }
    }

    void refresh()

    // Keep a server-backed refresh path for signed-out visitors because
    // realtime INSERT events can be restricted by RLS to authenticated users.
    const interval = setInterval(() => {
      void refresh()
    }, ACTIVITY_POLL_INTERVAL_MS)

    let channel: ReturnType<NonNullable<ReturnType<typeof createClient>>['channel']> | null = null
    const supabase = createClient()

    if (supabase) {
      channel = supabase
        .channel('homepage-activity')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'povprasevanja' }, (payload: RealtimePostgresInsertPayload<PovprasevanjeInsertPayload>) => {
          const next = payload.new as Partial<PovprasevanjeInsertPayload>
          if (!next.id || !next.created_at) return

          const item: HomeActivityItem = {
            id: next.id,
            city: next.location_city || 'neznano mesto',
            category: next.kategorija || 'splošno storitev',
            createdAt: next.created_at,
          }

          setItems((current) => {
            const filtered = current.filter((entry) => entry.id !== item.id)
            return [item, ...filtered].slice(0, 8)
          })

          // Keep server-backed path as source of truth for unauthenticated/public clients.
          void refresh()
        })
        .subscribe()
    }

    return () => {
      clearInterval(interval)
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return (
    <section className="border-y bg-muted/30 py-3">
      <div className="mx-auto max-w-7xl overflow-hidden px-4 lg:px-8">
        <div className="whitespace-nowrap text-sm text-muted-foreground">
          {items.length
            ? items
                .slice(0, 6)
                .map((item) => `Pravkar: Stranka iz ${item.city} išče ${item.category}`)
                .join(' • ')
            : fallbackText}
        </div>
      </div>
    </section>
  )
}
