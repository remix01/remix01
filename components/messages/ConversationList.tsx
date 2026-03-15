'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

interface Conversation {
  povprasevanje_id: string
  povprasevanje_title: string
  other_user_id: string
  other_user_name: string
  last_message: string
  last_message_time: string
  unread_count: number
  sender_id: string
}

interface ConversationListProps {
  currentUserId: string
  selectedConversation: string | null
  onSelectConversation: (povprasevanjeId: string, receiverId: string) => void
}

export function ConversationList({
  currentUserId,
  selectedConversation,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadConversations = async () => {
      try {
        // Query grouped conversations with unread count
        const { data, error } = await supabase
          .from('sporocila')
          .select(
            `
            id,
            povprasevanje_id,
            povprasevanja!inner(naslov),
            sender_id,
            receiver_id,
            message,
            is_read,
            created_at,
            sender:profiles!sender_id(full_name),
            receiver:profiles!receiver_id(full_name)
          `
          )
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Group by povprasevanje_id and get latest message + unread count
        const convMap = new Map<string, any>()

        data?.forEach((msg: any) => {
          const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
          const otherName =
            msg.sender_id === currentUserId ? msg.receiver?.full_name : msg.sender?.full_name

          if (!convMap.has(msg.povprasevanje_id)) {
            convMap.set(msg.povprasevanje_id, {
              povprasevanje_id: msg.povprasevanje_id,
              povprasevanje_title: (msg.povprasevanja as any)?.naslov || 'Povpraševanje',
              other_user_id: otherId,
              other_user_name: otherName,
              last_message: msg.message,
              last_message_time: msg.created_at,
              unread_count: 0,
              sender_id: msg.sender_id,
            })
          }
        })

        // Now count unread messages for each conversation
        const { data: unreadData, error: unreadError } = await supabase
          .from('sporocila')
          .select('povprasevanje_id, COUNT(*) as count')
          .eq('receiver_id', currentUserId)
          .eq('is_read', false)

        if (!unreadError && unreadData) {
          unreadData.forEach((item: any) => {
            const conv = convMap.get(item.povprasevanje_id)
            if (conv) {
              conv.unread_count = item.count || 0
            }
          })
        }

        // Sort by last message time, newest first
        const sortedConversations = Array.from(convMap.values()).sort(
          (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        )

        setConversations(sortedConversations)
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()

    // Subscribe to new messages and changes
    const channel = supabase
      .channel(`sporocila_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sporocila',
          filter: `or(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})`,
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sporocila',
          filter: `receiver_id.eq.${currentUserId}`,
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-lg border">
        <p className="text-slate-500">Nalagam pogovore...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-y-auto h-full flex flex-col">
      <div className="p-4 border-b sticky top-0 bg-white">
        <h2 className="font-semibold text-slate-900">Pogovori</h2>
      </div>

      {conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Ni pogovorov</p>
          </div>
        </div>
      ) : (
        <div className="divide-y overflow-y-auto flex-1">
          {conversations.map((conv) => (
            <button
              key={conv.povprasevanje_id}
              onClick={() => onSelectConversation(conv.povprasevanje_id, conv.other_user_id)}
              className={`w-full text-left p-4 transition-colors hover:bg-slate-50 border-l-4 ${
                selectedConversation === conv.povprasevanje_id
                  ? 'bg-blue-50 border-l-[#0F3460]'
                  : 'border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-medium text-slate-900 truncate">{conv.other_user_name}</p>
                {conv.unread_count > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <Badge className="bg-red-500 text-white text-xs">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">{conv.povprasevanje_title}</p>
              <p className="text-sm text-slate-600 line-clamp-1 mb-1">
                {conv.last_message && conv.last_message.length > 50
                  ? `${conv.last_message.substring(0, 50)}...`
                  : conv.last_message}
              </p>
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(conv.last_message_time), {
                  addSuffix: true,
                  locale: sl,
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
