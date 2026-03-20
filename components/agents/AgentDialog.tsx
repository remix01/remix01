'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, Send, Trash2, Loader2 } from 'lucide-react'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { AGENT_META } from '@/lib/agents/ai-router'

type Message = {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

type Props = {
  agentType: AIAgentType
  /** Pass structured data the agent should know about (offers, inquiry details, etc.) */
  context?: Record<string, unknown>
  /** Custom trigger label */
  triggerLabel?: string
  /** Tailwind classes for trigger button */
  triggerClassName?: string
  /** Initial message sent automatically when dialog opens */
  initialMessage?: string
}

export function AgentDialog({
  agentType,
  context,
  triggerLabel,
  triggerClassName,
  initialMessage,
}: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number | null } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const meta = AGENT_META[agentType]

  // Load history when dialog opens
  useEffect(() => {
    if (!open || historyLoaded) return
    fetch(`/api/agent/${agentType}`)
      .then(r => r.json())
      .then(({ messages: hist }) => {
        if (Array.isArray(hist) && hist.length > 0) {
          setMessages(hist)
        } else if (initialMessage) {
          sendMessage(initialMessage, true)
        }
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = useCallback(
    async (text: string, silent = false) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      if (!silent) {
        setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: Date.now() }])
        setInput('')
      }
      setLoading(true)

      try {
        const res = await fetch(`/api/agent/${agentType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, context }),
        })
        const data = await res.json()

        if (data.error) {
          setMessages(prev => [
            ...prev,
            { role: 'agent', content: `⚠️ ${data.error}`, timestamp: Date.now() },
          ])
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'agent', content: data.message, timestamp: Date.now() },
          ])
          if (data.usage) setUsageInfo(data.usage)
        }
      } catch {
        setMessages(prev => [
          ...prev,
          { role: 'agent', content: 'Napaka pri povezavi. Poskusite znova.', timestamp: Date.now() },
        ])
      } finally {
        setLoading(false)
      }
    },
    [agentType, context, loading]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearConversation = async () => {
    await fetch(`/api/agent/${agentType}`, { method: 'DELETE' })
    setMessages([])
    setHistoryLoaded(false)
    if (initialMessage) sendMessage(initialMessage, true)
  }

  const handleOpen = () => {
    setOpen(true)
    if (!historyLoaded && messages.length === 0 && !initialMessage) {
      setHistoryLoaded(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        size="sm"
        className={triggerClassName}
      >
        {triggerLabel ?? meta.label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full sm:max-w-lg sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-500">{meta.description}</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Počisti pogovor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-gray-400">
                  {historyLoaded ? 'Začnite pogovor...' : 'Nalagam...'}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Usage indicator */}
            {usageInfo && usageInfo.limit !== null && (
              <div className="px-4 pb-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{usageInfo.used}/{usageInfo.limit} sporočil danes</span>
                  {usageInfo.used >= usageInfo.limit && (
                    <span className="text-red-500">Limit dosežen</span>
                  )}
                </div>
                <div className="h-1 bg-gray-100 rounded-full">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      usageInfo.used >= usageInfo.limit ? 'bg-red-400' :
                      usageInfo.used >= usageInfo.limit * 0.8 ? 'bg-amber-400' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min((usageInfo.used / usageInfo.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-100">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Vaše sporočilo..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 max-h-28"
                  style={{ minHeight: '40px' }}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || loading}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 rounded-xl h-10 w-10 p-0 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Enter za pošlji · Shift+Enter za novo vrstico</p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
