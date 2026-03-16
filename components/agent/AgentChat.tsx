'use client'

import React, { useRef, useLayoutEffect } from 'react'
import { X, Send, Trash2, WifiOff, Loader2, Paperclip } from 'lucide-react'
import { useAgentChat, type ConnectionStatus } from './useAgentChat'
import { AgentMessage } from './AgentMessage'
import { uploadFile, generateFilePath } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'

type AgentChatProps = {
  messages: ReturnType<typeof useAgentChat>['messages']
  isLoading: boolean
  connectionStatus: ConnectionStatus
  lastError: string | null
  sendMessage: (content: string) => void
  clearConversation: () => void
  closeChat: () => void
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === 'loading') {
    return <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
  }
  if (status === 'error') {
    return <WifiOff className="w-3.5 h-3.5 text-red-400" />
  }
  if (status === 'connected') {
    return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
  }
  return null
}

export function AgentChat({ messages, isLoading, connectionStatus, lastError, sendMessage, clearConversation, closeChat }: AgentChatProps) {
  const [input, setInput] = React.useState('')
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null)
  const [attachmentUploading, setAttachmentUploading] = React.useState(false)
  const [attachmentUrl, setAttachmentUrl] = React.useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentFile(file)
    setAttachmentUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? 'anonymous'
      const path = generateFilePath(userId, file.name)
      const { url } = await uploadFile('chat-attachments', path, file)
      setAttachmentUrl(url)
    } catch {
      setAttachmentUrl(null)
    } finally {
      setAttachmentUploading(false)
    }
  }

  const clearAttachment = () => {
    setAttachmentFile(null)
    setAttachmentUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    const messageContent = attachmentUrl
      ? `${input.trim() ? input + '\n' : ''}[Priložena datoteka: ${attachmentUrl}]`
      : input.trim()
    if (messageContent) {
      sendMessage(messageContent)
      setInput('')
      clearAttachment()
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const canSend = !isLoading && !attachmentUploading && (!!input.trim() || !!attachmentUrl)

  const handleClear = () => {
    if (window.confirm('Izbrisati celoten pogovor?')) {
      clearConversation()
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      <div className="fixed bottom-0 right-0 w-full h-[70vh] md:bottom-6 md:right-6 md:w-96 md:h-[600px] bg-white rounded-t-xl md:rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm">LiftGO Asistent</h2>
            <StatusDot status={connectionStatus} />
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
                aria-label="Izbriši pogovor"
                title="Izbriši pogovor"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button
              onClick={closeChat}
              className="p-1.5 hover:bg-slate-200 rounded-md transition-colors"
              aria-label="Zapri chat"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {connectionStatus === 'loading' && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Nalagam pogovor...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 px-4">
                <p className="text-sm font-medium mb-1">Pozdravljeni! 👋</p>
                <p className="text-xs text-slate-400">Opišite, kaj potrebujete, in pomagal vam bom najti pravega mojstra v Sloveniji.</p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <AgentMessage
                key={message.id}
                message={message}
                onRetry={() => {
                  if (message.status === 'error' && message.role === 'user') {
                    sendMessage(message.content)
                  }
                }}
              />
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
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

        {/* Input */}
        <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl">
          {lastError && (
            <p className="text-xs text-red-500 mb-2 px-1">{lastError}</p>
          )}
          {attachmentFile && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-slate-100 rounded-lg text-xs">
              {attachmentUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="flex-1 truncate text-slate-700">{attachmentFile.name}</span>
              <button onClick={clearAttachment} className="text-slate-400 hover:text-red-500" aria-label="Odstrani prilogo">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Priloži datoteko"
              title="Priloži datoteko"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napišite sporočilo..."
              disabled={isLoading}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!canSend}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex-shrink-0"
              aria-label="Pošlji sporočilo"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">Enter za pošiljanje · Shift+Enter za novo vrstico</p>
        </div>
      </div>
    </>
  )
}
