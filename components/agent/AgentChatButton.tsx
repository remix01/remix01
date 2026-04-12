'use client'
// components/agent/AgentChatButton.tsx

import React from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentChat } from './AgentChat'
import { useAuth } from '@/lib/auth/AuthContext'

export function AgentChatButton() {
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const { isOpen, setIsOpen, unreadCount, messages, isLoading, sendMessage, clearConversation, closeChat, connectionStatus, lastError } = useAgentChat()
  const hasDedicatedAssistant = pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/moj-dom') || pathname.startsWith('/profil') || pathname.startsWith('/obvestila') || pathname.startsWith('/povprasevanja') || pathname.startsWith('/novo-povprasevanje') || pathname.startsWith('/ocena') || pathname.startsWith('/sporocila')

  if (authLoading || !user || hasDedicatedAssistant) {
    return null
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={setIsOpen}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-200 hover:scale-110 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Odpri chat z LiftGO asistentom"
          aria-haspopup="dialog"
          title="Chat z LiftGO asistentom"
        >
          <MessageCircle className="w-6 h-6" aria-hidden="true" />

          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 leading-none"
              aria-live="polite"
              aria-label={`${unreadCount} neprebrana sporočila`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {unreadCount > 0 && (
            <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-30" />
          )}
        </button>
      )}

      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label="LiftGO chat asistent">
          <AgentChat messages={messages} isLoading={isLoading} connectionStatus={connectionStatus} lastError={lastError} sendMessage={sendMessage} clearConversation={clearConversation} closeChat={closeChat} />
        </div>
      )}
    </>
  )
}
