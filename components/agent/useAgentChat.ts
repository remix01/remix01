'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'

export type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
  status: 'sending' | 'sent' | 'error'
}

export type ConnectionStatus = 'idle' | 'loading' | 'connected' | 'error'

const UNREAD_KEY = 'liftgo_chat_unread'

function loadUnread(): number {
  try {
    return parseInt(localStorage.getItem(UNREAD_KEY) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function saveUnread(n: number) {
  try {
    localStorage.setItem(UNREAD_KEY, String(n))
  } catch {}
}

export function useAgentChat() {
  const { user, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpenState] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastWarning, setLastWarning] = useState<string | null>(null)
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number | null } | null>(null)
  const historyLoaded = useRef(false)

  // Load conversation history from server AFTER auth is ready
  useEffect(() => {
    // Skip if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      return
    }

    // Skip if already loaded
    if (historyLoaded.current) return
    historyLoaded.current = true

    setConnectionStatus('loading')
    fetch('/api/agent/chat', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data.messages)) return
        const loaded: ChatMessage[] = data.messages.map((m: any) => ({
          id: crypto.randomUUID(),
          role: m.role as 'user' | 'agent',
          content: m.content,
          timestamp: m.timestamp ?? Date.now(),
          status: 'sent' as const,
        }))
        setMessages(loaded)
        setConnectionStatus('connected')
      })
      .catch(err => {
        // Silently fail — chat works without history
        console.error('[v0] Failed to load chat history:', err)
        setConnectionStatus('idle')
      })
  }, [authLoading, user])

  // Restore unread count from localStorage on mount
  useEffect(() => {
    setUnreadCount(loadUnread())
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMessageId = crypto.randomUUID()
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'sending',
      }

      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)
      setConnectionStatus('loading')
      setLastError(null)

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: content }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          const errorMsg = err.error || `Napaka strežnika (${response.status})`
          // requiresLogin: hint to show login prompt
          if (err.requiresLogin) {
            setLastError(errorMsg + ' → /prijava')
          } else {
            setLastError(errorMsg)
          }
          throw new Error(errorMsg)
        }

        const data = await response.json()

        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: data.message || 'Napaka pri odgovoru.',
          timestamp: Date.now(),
          status: 'sent',
        }

        setMessages(prev =>
          prev
            .map(msg => msg.id === userMessageId ? { ...msg, status: 'sent' as const } : msg)
            .concat(agentMessage)
        )

        setConnectionStatus('connected')
        setLastError(null)
        setLastWarning(data.warning ?? null)
        if (data.usage) setUsageInfo(data.usage)

        // Increment unread only if chat is closed
        if (!isOpen) {
          setUnreadCount(prev => {
            const next = prev + 1
            saveUnread(next)
            return next
          })
        }
      } catch (error: any) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessageId ? { ...msg, status: 'error' as const } : msg
          )
        )
        setConnectionStatus('error')
        if (!lastError) setLastError('Napaka pri pošiljanju. Poskusite znova.')
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, isOpen, lastError]
  )

  const clearConversation = useCallback(async () => {
    try {
      await fetch('/api/agent/chat', { 
        method: 'DELETE',
        credentials: 'include',
      })
      setMessages([])
      setLastError(null)
    } catch {
      // ignore
    }
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpenState(true)
    setUnreadCount(0)
    saveUnread(0)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpenState(false)
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearConversation,
    isOpen,
    setIsOpen: handleOpen,
    closeChat: handleClose,
    unreadCount,
    connectionStatus,
    lastError,
    lastWarning,
    usageInfo,
  }
}
