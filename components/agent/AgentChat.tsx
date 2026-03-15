'use client'

import React, { useRef, useLayoutEffect } from 'react'
import { X, Send } from 'lucide-react'
import { AgentMessage } from './AgentMessage'
import type { ChatMessage } from './useAgentChat'

type AgentChatProps = {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string) => void
  onClose: () => void
}

export function AgentChat({ messages, isLoading, sendMessage, onClose }: AgentChatProps) {
  const [input, setInput] = React.useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (input.trim()) {
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
      {/* Mobilni backdrop — zapira chat na klik zunaj */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat okno — z-50 nad gumbom (z-40) */}
      <div className="fixed bottom-0 right-0 w-full h-[70vh] md:bottom-6 md:right-6 md:w-96 md:h-[600px] bg-white rounded-t-xl md:rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50">
        {/* Glava */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              LG
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">LiftGO Asistent</h2>
              <p className="text-xs text-teal-600">Na voljo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-md transition-colors"
            aria-label="Zapri chat"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Seznam sporočil */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 px-4">
                <p className="text-sm font-medium mb-1">Pozdravljeni! 👋</p>
                <p className="text-xs">
                  Pomagam vam najti pravega obrtnika. Opišite vaš problem in vam svetujem.
                </p>
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
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                LG
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-lg flex gap-1 items-center">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Vnosno polje */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Vnesite sporočilo..."
              disabled={isLoading}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-300 transition-colors"
              aria-label="Pošlji sporočilo"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
