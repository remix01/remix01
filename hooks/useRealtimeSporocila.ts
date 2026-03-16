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

// Payload shape emitted by tr_broadcast_sporocila trigger
interface BroadcastPayload {
  schema: string
  table: string
  commit_timestamp: string
  new: Message | null
  old: Message | null
}

export function useRealtimeSporocila(povprasevanjeId: string, currentUserId: string) {
  const [sporocila, setSporocila] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

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

        // Mark incoming messages as read on initial load
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

  // Subscribe to private broadcast channel
  useEffect(() => {
    const topic = `room:povp:${povprasevanjeId}:messages`

    const channel = supabaseRef.current
      .channel(topic, {
        config: { private: true },
      })
      .on<BroadcastPayload>('broadcast', { event: 'INSERT' }, ({ payload }) => {
        const newMsg = payload?.new
        if (!newMsg) return
        setSporocila(prev => {
          // Deduplicate — message may already exist from optimistic insert
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        // Auto-mark as read if we are the receiver
        if (newMsg.receiver_id === currentUserId) {
          supabaseRef.current
            .from('sporocila')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', newMsg.id)
            .then()
        }
      })
      .on<BroadcastPayload>('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        const updated = payload?.new
        if (!updated) return
        setSporocila(prev => prev.map(m => m.id === updated.id ? updated : m))
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[RT] Chat channel error:', topic)
        }
      })

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [povprasevanjeId, currentUserId])

  const sendMessage = useCallback(
    async (text: string, receiverId: string): Promise<boolean> => {
      if (!text.trim()) return false

      try {
        const { error: err } = await supabaseRef.current
          .from('sporocila')
          .insert({
            povprasevanje_id: povprasevanjeId,
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: text.trim(),
            is_read: false,
          })

        if (err) throw err

        // Notify receiver — fire-and-forget
        supabaseRef.current
          .from('notifications')
          .insert({
            user_id: receiverId,
            type: 'novo_sporocilo',
            title: 'Novo sporočilo',
            message: text.trim().substring(0, 100),
            data: { povprasevanje_id: povprasevanjeId },
            is_read: false,
          })
          .then()

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Napaka pri pošiljanju sporočila')
        return false
      }
    },
    [povprasevanjeId, currentUserId]
  )

  // Send a typing indicator broadcast (client-to-client, not persisted)
  const sendTyping = useCallback(async () => {
    const topic = `room:povp:${povprasevanjeId}:messages`
    await supabaseRef.current.channel(topic).send({
      type: 'broadcast',
      event: 'typing_started',
      payload: { user_id: currentUserId },
    })
  }, [povprasevanjeId, currentUserId])

  return { sporocila, sendMessage, sendTyping, isLoading, error }
}
