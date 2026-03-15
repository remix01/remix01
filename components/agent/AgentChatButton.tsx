'use client'
// components/agent/AgentChatButton.tsx

import React, { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentChat } from './AgentChat'
import { createClient } from '@/lib/supabase/client'

export function AgentChatButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const { isOpen, setIsOpen, unreadCount, messages, isLoading, sendMessage, closeChat } = useAgentChat()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsAuthChecked(true)
      }
    }
    checkAuth()
  }, [])

  // Wait for auth check to avoid layout flash
  if (!isAuthChecked) return null

  const handleOpen = () => {
    if (!isAuthenticated) {
      window.location.href = '/prijava'
      return
    }
    setIsOpen()
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 flex items-center justify-center transition-all duration-200 z-40 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
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
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-30 pointer-events-none" />
          )}
        </button>
      )}

      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label="LiftGO chat asistent">
          <AgentChat messages={messages} isLoading={isLoading} sendMessage={sendMessage} closeChat={closeChat} />
        </div>
      )}
    </>
  )
}
