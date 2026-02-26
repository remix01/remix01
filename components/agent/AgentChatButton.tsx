'use client'

import React, { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentChat } from './AgentChat'
import { createClient } from '@/lib/supabase/client'

export function AgentChatButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { isOpen, setIsOpen, unreadCount } = useAgentChat()

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Don't show anything while loading or if not authenticated
  if (isLoading || !isAuthenticated) return null

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen()}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-all z-40 hover:scale-110"
        aria-label="Open chat"
        title="Chat with LiftGO Assistant"
      >
        <MessageCircle className="w-6 h-6" />

        {/* Badge showing unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse animation when unread messages */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-50" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && <AgentChat />}
    </>
  )
}
