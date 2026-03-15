'use client'

import React, { useRef, useLayoutEffect, useState } from 'react'
import { X, Send, Trash2 } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentMessage } from './AgentMessage'

type AgentChatProps = {
  messages: ReturnType<typeof useAgentChat>['messages']
  isLoading: boolean
  sendMessage: (content: string) => void
  closeChat: () => void
  clearMessages?: () => void
}

export function AgentChat({ messages, isLoading, sendMessage, closeChat, clearMessages }: AgentChatProps) {
  const [input, setInput] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect new error messages and show inline error
  useLayoutEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.status === 'error') {
      setSendError('Napaka pri pošiljanju. Preverite internetno povezavo.')
    } else {
      setSendError(null)
    }
  }, [messages])

  const handleSendMessage = () => {
    if (input.trim()) {
      setSendError(null)
      sendMessage(input)
      setInput('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      <div className="fixed bottom-0 right-0 w-full h-[70vh] md:bottom-6 md:right-6 md:w-96 md:h-[600px] bg-white rounded-t-xl md:rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            🚀 LiftGO Asistent
          </h2>
          <div className="flex items-center gap-1">
            {clearMessages && messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                aria-label="Počisti pogovor"
                title="Počisti pogovor"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <button
              onClick={closeChat}
              className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
              aria-label="Zapri chat"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 px-4">
                <p className="text-2xl mb-3">👋</p>
                <p className="text-sm font-medium text-slate-700 mb-1">Pozdravljeni! Sem LiftGO asistent.</p>
                <p className="text-xs">Pomagam vam najti pravega mojstra ali odgovoriti na vprašanja o platformi.</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <AgentMessage
              key={message.id}
              message={message}
              onRetry={() => {
                if (message.status === 'error' && message.role === 'user') {
                  setSendError(null)
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

        {/* Error message */}
        {sendError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
            {sendError}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napišite sporočilo..."
              disabled={isLoading}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              rows={1}
              aria-label="Vaše sporočilo"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
              aria-label="Pošlji sporočilo"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Enter za pošiljanje · Shift+Enter za novo vrstico
          </p>
        </div>
      </div>
    </>
  )
}
