'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  povprasevanje_id: string
  content: string
  created_at: string
  sender_name?: string
}

interface ChatPanelProps {
  povprasevanjeId: string
  currentUserId: string
  currentUserName: string
  otherUserId: string
  otherUserName: string
}

export function ChatPanel({
  povprasevanjeId,
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
}: ChatPanelProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [channel, setChannel] = useState<any>(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load initial messages and subscribe
  useEffect(() => {
    const loadMessagesAndSubscribe = async () => {
      try {
        // Load existing messages
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('povprasevanje_id', povprasevanjeId)
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages((data || []) as Message[])

        // Subscribe to new messages
        const subscription = supabase
          .channel(`messages:${povprasevanjeId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `povprasevanje_id=eq.${povprasevanjeId}`,
            },
            (payload: any) => {
              setMessages((prev) => [...prev, payload.new as Message])
            }
          )
          .subscribe()

        setChannel(subscription)
      } catch (error) {
        console.error('[v0] Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessagesAndSubscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [povprasevanjeId, currentUserId, otherUserId])

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    try {
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: currentUserId,
          receiver_id: otherUserId,
          povprasevanje_id: povprasevanjeId,
          content: newMessage.trim(),
          sender_name: currentUserName,
        },
      ])

      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('[v0] Error sending message:', error)
      alert('Napaka pri pošiljanju sporočila')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="flex flex-col h-96 md:h-screen max-h-screen md:max-h-96">
      {/* Header */}
      <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Klepet</h3>
          <p className="text-sm text-slate-600">{otherUserName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Ni sporočil. Začnite pogovor!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-slate-200 text-slate-900 rounded-bl-none'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-slate-600'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('sl-SI', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Napišite sporočilo..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
