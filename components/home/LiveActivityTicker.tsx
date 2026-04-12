'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HomeActivityItem } from './types'

interface LiveActivityTickerProps {
  initialItems: HomeActivityItem[]
}

export function LiveActivityTicker({ initialItems }: LiveActivityTickerProps) {
  const [items, setItems] = useState<HomeActivityItem[]>(initialItems)

  const fallbackText = useMemo(
    () => 'Pravkar: stranke po Sloveniji oddajajo nova povpraševanja.',
    []
  )

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch('/api/home/activity', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.items)) setItems(data.items)
    }

    const interval = setInterval(refresh, 12000)

    let channel: ReturnType<NonNullable<ReturnType<typeof createClient>>['channel']> | null = null
    const supabase = createClient()
    if (supabase) {
      channel = supabase
        .channel('homepage-activity')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'povprasevanja' }, () => {
          refresh()
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
