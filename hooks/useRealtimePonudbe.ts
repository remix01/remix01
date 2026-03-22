'use client'

import { useEffect, useState } from 'react'
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

export function useRealtimePonudbe(povprasevanjeId: string) {
  const [ponudbe, setPonudbe] = useState<Ponudba[]>([])
  const [newPonudbaCount, setNewPonudbaCount] = useState(0)

  useEffect(() => {
    if (!povprasevanjeId) return

    try {
      const supabase = createClient()

      // Load existing ponudbe
      supabase
        .from('ponudbe')
        .select('*')
        .eq('povprasevanje_id', povprasevanjeId)
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error('[v0] Error loading ponudbe:', error)
            return
          }
          if (data) {
            setPonudbe(data)
          }
        })
        .catch((error: any) => {
          console.error('[v0] Error in ponudbe query:', error)
        })

      // Subscribe to new ponudbe for this povprasevanje
      const channel = supabase
        .channel(`ponudbe:${povprasevanjeId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ponudbe',
            filter: `povprasevanje_id=eq.${povprasevanjeId}`,
          },
          (payload: any) => {
            try {
              const newPonudba = payload.new as Ponudba
              setPonudbe(prev => [newPonudba, ...prev])
              setNewPonudbaCount(prev => prev + 1)

              // Show toast notification
              toast.success('Nova ponudba prispela!')
            } catch (error) {
              console.error('[v0] Error processing ponudba:', error)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('[v0] Error initializing ponudbe realtime:', error)
      return () => {}
    }
  }, [povprasevanjeId])

  return { ponudbe, newPonudbaCount }
}
