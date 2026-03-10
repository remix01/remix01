'use client'

import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

export interface ChatMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
  read_at?: string
}

interface ChatMessageProps {
  message: ChatMessage
  isOwn: boolean
}

export function ChatMessageComponent({ message, isOwn }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0 w-8 h-8 bg-slate-300 rounded-full" />
      <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 text-slate-900'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
            locale: sl,
          })}
        </p>
      </div>
    </div>
  )
}
