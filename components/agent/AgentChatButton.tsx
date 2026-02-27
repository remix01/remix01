'use client'
// components/agent/AgentChatButton.tsx

import React, { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentChat } from './AgentChat'
import { createClient } from '@/lib/supabase/client'

export function AgentChatButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { isOpen, setIsOpen, unreadCount } = useAgentChat()

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

  if (isLoading || !isAuthenticated) return null

  return (
    <>
      {/* FIX 1: z-50 namesto z-40 — mora biti nad cookie bannerjem in ostalimi
          fixed elementi. Cookie consent ima tipično z-40/z-50. */}
      <button
        onClick={() => setIsOpen()}
        // FIX 2: Dodan 'group' za hover child animacije
        // FIX 8: Na mobilnih je button nižje (bottom-20 -> bottom-24) da se ne prekriva s chat panelom ko je odprt
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 flex items-center justify-center transition-all duration-200 z-50 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 group"
        // FIX 3: aria-label dinamično glede na stanje (odprt/zaprt)
        aria-label={isOpen ? 'Zapri chat' : 'Odpri chat z LiftGO asistentom'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={isOpen ? 'Zapri chat' : 'Chat z LiftGO asistentom'}
      >
        {/* FIX 4: Ikona se zamenja med MessageCircle in X glede na stanje */}
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 leading-none"
            // FIX 5: aria-live za screen readerje — oznanjuje nova sporočila
            aria-live="polite"
            aria-label={`${unreadCount} neprebrana sporočila`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* FIX 6: Pulse animacija je bila na inset-0 z bg-red-500 —
            to je pokrivalo ikono. Premaknjeno navzven kot ring efekt. */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-30 pointer-events-none" />
        )}
      </button>

      {/* FIX 7: role="dialog" + aria-modal za dostopnost chat panela */}
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label="LiftGO chat asistent">
          <AgentChat />
        </div>
      )}
    </>
  )
}
