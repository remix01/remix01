'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Ponudba {
  id: string
  povprasevanje_id: string
  obrtnik_id: string
  price: number
  duration_days: number
  message: string
  created_at: string
  status: 'poslana' | 'sprejeta' | 'zavrnjena'
}

interface BroadcastPayload {
  schema: string
  table: string
  commit_timestamp: string
  new: Ponudba | null
  old: Ponudba | null
}

export function useRealtimePonudbe(povprasevanjeId: string) {
  const [ponudbe, setPonudbe] = useState<Ponudba[]>([])
  const [newPonudbaCount, setNewPonudbaCount] = useState(0)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!povprasevanjeId) return

    const supabase = supabaseRef.current

    // Load existing ponudbe
    supabase
      .from('ponudbe')
      .select('*')
      .eq('povprasevanje_id', povprasevanjeId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[RT] Error loading ponudbe:', error)
          return
        }
        if (data) setPonudbe(data as Ponudba[])
      })

    // Subscribe to private broadcast channel for job updates
    const topic = `povp:${povprasevanjeId}:updates`

    const channel = supabase
      .channel(topic, {
        config: { private: true },
      })
      .on<BroadcastPayload>('broadcast', { event: 'INSERT' }, ({ payload }) => {
        if (payload?.table !== 'ponudbe') return
        const p = payload.new
        if (!p) return
        setPonudbe(prev => {
          if (prev.some(existing => existing.id === p.id)) return prev
          return [p, ...prev]
        })
        setNewPonudbaCount(prev => prev + 1)
        toast.success('Nova ponudba prispela!')
      })
      .on<BroadcastPayload>('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        if (payload?.table !== 'ponudbe') return
        const p = payload.new
        if (!p) return
        setPonudbe(prev => prev.map(existing => existing.id === p.id ? p : existing))

        if (p.status === 'sprejeta') {
          toast.success('Ponudba sprejeta!')
        } else if (p.status === 'zavrnjena') {
          toast.info('Ponudba zavrnjena')
        }
      })
      .on<BroadcastPayload>('broadcast', { event: 'DELETE' }, ({ payload }) => {
        if (payload?.table !== 'ponudbe') return
        const old = payload.old
        if (!old) return
        setPonudbe(prev => prev.filter(p => p.id !== old.id))
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[RT] Ponudbe channel error:', topic)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [povprasevanjeId])

  return { ponudbe, newPonudbaCount }
}
