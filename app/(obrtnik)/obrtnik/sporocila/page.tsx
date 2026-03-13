'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, MessageCircle } from 'lucide-react'

interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  last_message: string
  last_message_time: string
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function SporocilePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeChat()
  }, [])

  const initializeChat = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      router.push('/partner-auth/login')
      return
    }
    setUser(currentUser)
    await loadConversations(currentUser.id)
    setLoading(false)
  }

  const loadConversations = async (userId: string) => {
    const { data: convos } = await supabase
      .from('sporocila')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        sender:profiles!sender_id(full_name)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    // Group messages by conversation
    const convMap = new Map<string, any>()
    convos?.forEach((msg: any) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          other_user_id: otherId,
          other_user_name: msg.sender.full_name,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0,
        })
      }
    })

    setConversations(Array.from(convMap.values()))
  }

  const loadMessages = async (otherId: string) => {
    if (!user) return
    
    const { data: msgs } = await supabase
      .from('sporocila')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return

    const { error } = await supabase
      .from('sporocila')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConv,
        content: newMessage,
      })

    if (!error) {
      setNewMessage('')
      loadMessages(selectedConv)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nalagam pogovore...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto h-screen flex flex-col md:flex-row gap-4 p-4">
        {/* Conversations List */}
        <div className="md:w-1/3 bg-white rounded-lg border overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white">
            <h2 className="font-bold text-lg">Pogovori</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ni pogovorov</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.other_user_id}
                onClick={() => {
                  setSelectedConv(conv.other_user_id)
                  loadMessages(conv.other_user_id)
                }}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition ${
                  selectedConv === conv.other_user_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{conv.other_user_name}</p>
                  {conv.unread_count > 0 && (
                    <Badge className="bg-blue-500">{conv.unread_count}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{conv.last_message}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(conv.last_message_time).toLocaleString('sl-SI')}</p>
              </button>
            ))
          )}
        </div>

        {/* Chat Panel */}
        <div className="md:w-2/3 bg-white rounded-lg border flex flex-col">
          {selectedConv ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4 flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Napišite sporočilo..."
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Izberite pogovor</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
