'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

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

interface ChatPanelProps {
  messages: Message[]
  currentUserId: string
  otherUserName: string
  onSendMessage: (text: string, receiverId: string) => Promise<boolean>
  receiverId: string
  isLoading?: boolean
  povprasevanjeTitle?: string
  povprasevanjeId?: string
}

export function ChatPanel({
  messages,
  currentUserId,
  otherUserName,
  onSendMessage,
  receiverId,
  isLoading = false,
  povprasevanjeTitle,
  povprasevanjeId,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    const success = await onSendMessage(newMessage, receiverId)
    if (success) {
      setNewMessage('')
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg border">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nalagam pogovore...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white rounded-lg border flex flex-col overflow-hidden">
      {/* Header */}
      {povprasevanjeTitle && (
        <div className="border-b px-4 py-3 bg-slate-50">
          <p className="font-medium text-slate-900">{otherUserName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{povprasevanjeTitle}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Ni sporočil</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${
                  msg.sender_id === currentUserId
                    ? 'bg-[#0F3460] text-white rounded-tl-2xl rounded-bl-2xl rounded-br-2xl'
                    : 'bg-slate-100 text-slate-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
                }`}
              >
                <p className="break-words text-sm">{msg.message}</p>
                <div
                  className={`text-xs mt-1 flex items-center gap-1 ${
                    msg.sender_id === currentUserId ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: false,
                    locale: sl,
                  })}
                  {msg.sender_id === currentUserId && (
                    msg.is_read ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Vaše sporočilo..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0F3460] focus:border-transparent text-sm max-h-24"
            rows={1}
            disabled={sending}
            style={{ minHeight: '40px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="bg-[#0F3460] text-white hover:bg-[#0F3460]/90 self-end flex-shrink-0"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
