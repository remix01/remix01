'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

type RequestRow = {
  id: string
  title: string
  status: string
  category_id: string
  narocnik_id: string
  created_at: string
}

export default function DashboardRequests() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { user, role, isLoading } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])

  const loadRequests = useCallback(async () => {
    if (!user || !role) {
      setRequests([])
      return
    }

    if (role === 'admin') {
      const { data } = await supabase
        .from('povprasevanja')
        .select('id,title,status,category_id,narocnik_id,created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      setRequests((data ?? []) as RequestRow[])
      return
    }

    if (role === 'customer') {
      const { data } = await supabase
        .from('povprasevanja')
        .select('id,title,status,category_id,narocnik_id,created_at')
        .eq('narocnik_id', user.id)
        .order('created_at', { ascending: false })

      setRequests((data ?? []) as RequestRow[])
      return
    }

    const { data: categories } = await supabase
      .from('obrtnik_categories')
      .select('category_id')
      .eq('obrtnik_id', user.id)

    const categoryIds = (categories ?? []).map((c: any) => c.category_id)

    const [openByCategory, ownOffers] = await Promise.all([
      categoryIds.length
        ? supabase
            .from('povprasevanja')
            .select('id,title,status,category_id,narocnik_id,created_at')
            .eq('status', 'odprto')
            .in('category_id', categoryIds)
        : Promise.resolve({ data: [] as RequestRow[] }),
      supabase
        .from('ponudbe')
        .select('povprasevanje_id')
        .eq('obrtnik_id', user.id),
    ])

    const ownIds = (ownOffers.data ?? []).map((r: any) => r.povprasevanje_id).filter(Boolean)

    let ownRequests: RequestRow[] = []
    if (ownIds.length > 0) {
      const { data } = await supabase
        .from('povprasevanja')
        .select('id,title,status,category_id,narocnik_id,created_at')
        .in('id', ownIds)

      ownRequests = (data ?? []) as RequestRow[]
    }

    const merged = [...((openByCategory.data ?? []) as RequestRow[]), ...ownRequests]
    const deduped = Array.from(new Map(merged.map((r) => [r.id, r])).values())
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

    setRequests(deduped)
  }, [role, supabase, user])

  useEffect(() => {
    if (!isLoading) {
      void loadRequests()
    }
  }, [isLoading, loadRequests])

  useEffect(() => {
    if (!user || !role) return

    const requestsChannel = supabase
      .channel('public:povprasevanja')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'povprasevanja' },
        () => {
          void loadRequests()
        },
      )
      .subscribe()

    const offersChannel = supabase
      .channel('public:ponudbe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ponudbe' }, () => {
        void loadRequests()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(offersChannel)
    }
  }, [loadRequests, role, supabase, user])

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div key={request.id} className="rounded border p-3 text-sm">
          <div className="font-medium">{request.title}</div>
          <div className="text-muted-foreground">{request.status}</div>
        </div>
      ))}
    </div>
  )
}
