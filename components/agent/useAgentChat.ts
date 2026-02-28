'use client'

import { useState, useCallback } from 'react'

export type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
  status: 'sending' | 'sent' | 'error'
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      // 1. Add user message to state immediately
      const userMessageId = crypto.randomUUID()
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'sending',
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        // 2. POST to /api/agent/chat with { message, conversationHistory }
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            conversationHistory: messages.map(msg => ({
              role: msg.role === 'agent' ? 'assistant' : 'user',
              content: msg.content
            }))
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send message')
        }

        const data = await response.json()

        // 3. On response: add agent message to state
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: data.message || 'Unable to process your request.',
          timestamp: Date.now(),
          status: 'sent',
        }

        // Update user message status to sent
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, status: 'sent' } : msg
          )
        )

        // Add agent message
        setMessages((prev) => [...prev, agentMessage])

        // Increment unread count if chat is closed
        if (!isOpen) {
          setUnreadCount((prev) => prev + 1)
        }
      } catch (error) {
        console.error('[v0] Error sending message:', error)

        // 4. On error: mark message as error, show retry option
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, status: 'error' } : msg
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages, isOpen]
  )

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setUnreadCount(0)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    isOpen,
    setIsOpen: handleOpen,
    closeChat: handleClose,
    unreadCount,
  }
}
