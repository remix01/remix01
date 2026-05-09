'use client'

import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { X, Trash2, Loader2, ArrowUp, Sparkles } from 'lucide-react'
import { useAgentChat, type ConnectionStatus } from './useAgentChat'
import { AgentMessage } from './AgentMessage'

type AgentChatProps = {
  messages: ReturnType<typeof useAgentChat>['messages']
  isLoading: boolean
  connectionStatus: ConnectionStatus
  lastError: string | null
  lastWarning: string | null
  usageInfo: { used: number; limit: number | null } | null
  sendMessage: (content: string) => void
  clearConversation: () => void
  closeChat: () => void
}

const STARTER_PROMPTS = [
  'Iščem dobrega vodovodarja v Ljubljani',
  'Potrebujem elektricistu v Mariboru',
  'Kdo opravi mansardno izolacijo?',
  'Popravilo parketa — koliko stane?',
]

export function AgentChat({ messages, isLoading, connectionStatus, lastError, lastWarning, usageInfo, sendMessage, clearConversation, closeChat }: AgentChatProps) {
  const [input, setInput] = React.useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  // Focus on open
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  const canSend = input.trim().length > 0 && !isLoading

  const handleSend = () => {
    if (!canSend) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    if (window.confirm('Izbrisati celoten pogovor?')) clearConversation()
  }

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed bottom-0 right-0 w-full h-[85vh] md:bottom-6 md:right-6 md:w-[420px] md:h-[640px] bg-white md:rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col z-50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">LiftGO Asistent</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-none">
                {connectionStatus === 'loading' && messages.length === 0
                  ? 'Nalagam...'
                  : usageInfo?.limit
                    ? `${usageInfo.used}/${usageInfo.limit} danes`
                    : 'Na voljo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Izbriši pogovor"
                title="Izbriši pogovor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeChat}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Zapri chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth py-2">

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mb-4 shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">Pozdravljeni!</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Pomagam vam najti pravega mojstra za vsako delo v Sloveniji.
              </p>

              {/* Starter prompts */}
              <div className="w-full space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { sendMessage(prompt) }}
                    className="w-full text-left text-sm px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {!isEmpty && messages.map((message) => (
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

          {/* Typing indicator */}
          {isLoading && (
            <div className="px-4 py-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs font-bold">L</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 bg-white">
          {lastWarning && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2">
              ⚠️ {lastWarning}
            </p>
          )}
          {lastError && (
            <p className="text-xs text-red-500 mb-2 px-1">
              {lastError.includes('→') ? (
                <>
                  {lastError.split('→')[0]}
                  <a href="/prijava" className="underline font-medium ml-1">Prijava</a>
                </>
              ) : lastError}
            </p>
          )}

          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sporočilo LiftGO asistentom…"
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none min-h-[24px] max-h-40 leading-6 disabled:opacity-50"
              style={{ height: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center transition-all disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-700 active:scale-95 self-end"
              aria-label="Pošlji"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-1.5 text-center">
            Enter za pošiljanje · Shift+Enter za novo vrstico
          </p>
        </div>
      </div>
    </>
  )
}
