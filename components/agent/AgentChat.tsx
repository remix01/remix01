'use client'

import React, { useEffect, useRef, useLayoutEffect } from 'react'
import { X, Send } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentMessage } from './AgentMessage'

export function AgentChat() {
  const { messages, isLoading, sendMessage, closeChat, isOpen, sessionId } = useAgentChat()
  const [input, setInput] = React.useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send greeting message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMessage = {
        id: crypto.randomUUID(),
        role: 'agent' as const,
        content: 'Hello! I can help you manage your inquiries, offers, and escrow. What would you like to do?',
        timestamp: Date.now(),
        status: 'sent' as const,
      }
      // We can't directly set messages, so we'll show it through the UI
      // This greeting should be shown when chat opens
    }
  }, [isOpen, messages.length])

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Mobile overlay backdrop — zapira chat na klik zunaj */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />
      
      <div className="fixed bottom-0 right-0 w-full h-[70vh] md:bottom-20 md:right-4 md:w-96 md:h-[600px] bg-white rounded-t-xl md:rounded-xl shadow-lg border border-slate-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl md:rounded-t-xl">
        <h2 className="font-semibold text-slate-900">LiftGO Assistant</h2>
        <button
          onClick={closeChat}
          className="p-1 hover:bg-slate-200 rounded-md transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <p className="text-sm">Hello! I can help you manage your inquiries, offers, and escrow. What would you like to do?</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <AgentMessage
            key={message.id}
            message={message}
            onRetry={() => {
              if (message.status === 'error' && message.role === 'user') {
                sendMessage(message.content)
              }
            }}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              LA
            </div>
            <div className="bg-slate-700 text-white px-4 py-2 rounded-lg flex gap-1 items-center">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl md:rounded-b-xl">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
