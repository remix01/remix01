'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  povprasevanje_id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

export function useRealtimeSporocila(povprasevanjeId: string, currentUserId: string) {
  const [sporocila, setSporocila] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())
  const subscriptionRef = useRef<any>(null)

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data, error: err } = await supabaseRef.current
          .from('sporocila')
          .select('*')
          .eq('povprasevanje_id', povprasevanjeId)
          .order('created_at', { ascending: true })

        if (err) throw err
        setSporocila(data || [])

        // Mark as read
        await supabaseRef.current
          .from('sporocila')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('povprasevanje_id', povprasevanjeId)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Napaka pri nalaganju sporočil')
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [povprasevanjeId, currentUserId])

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabaseRef.current
      .channel(`sporocila_${povprasevanjeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sporocila',
          filter: `povprasevanje_id=eq.${povprasevanjeId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setSporocila((prev) => [...prev, newMessage])

          // Mark as read if receiver
          if (newMessage.receiver_id === currentUserId) {
            supabaseRef.current
              .from('sporocila')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMessage.id)
              .then()
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [povprasevanjeId, currentUserId])

  const sendMessage = useCallback(
    async (text: string, receiverId: string): Promise<boolean> => {
      if (!text.trim()) return false

      try {
        // Use server route: enforces sender_id from session + sends Resend email notification
        const res = await fetch('/api/sporocila/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiver_id: receiverId,
            povprasevanje_id: povprasevanjeId,
            message: text.trim(),
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Napaka pri pošiljanju')
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Napaka pri pošiljanju sporočila')
        return false
      }
    },
    [povprasevanjeId]
  )

  return {
    sporocila,
    sendMessage,
    isLoading,
    error,
  }
}
