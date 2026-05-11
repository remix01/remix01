'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Minimize2, MessageCircle, Loader2, Check, Paperclip, Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { uploadFile, generateFilePath, validateFile } from '@/lib/storage'
import { useSpeechToText } from '@/hooks/useSpeechToText'

export type AgentType =
  | 'work_description'
  | 'offer_comparison'
  | 'offer_writing'
  | 'profile_optimization'

export type MessageRole = 'agent' | 'user' | 'system'
export type DialogState = 'open' | 'minimized' | 'closed'

interface ContextCardProps {
  type: 'inquiry' | 'offer'
  title: string
  location?: string
  urgency?: string
  budget?: string
  details?: { label: string; value: string }[]
}

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isLoading?: boolean
  metadata?: {
    type?: 'text' | 'structured' | 'action'
    data?: any
  }
}

interface AgentChatDialogProps {
  agentType: AgentType
  agentTitle: string
  agentIcon: React.ReactNode
  contextCard?: ContextCardProps
  onClose: () => void
  onSendMessage?: (message: string) => Promise<void>
}

const AGENT_TITLES: Record<AgentType, string> = {
  work_description: 'Pomoč pri opisu dela',
  offer_comparison: 'Primerjava ponudb',
  offer_writing: 'Pisanje ponudb',
  profile_optimization: 'Optimizacija profila',
}

const AGENT_INITIALS: Record<AgentType, string> = {
  work_description: 'PD',
  offer_comparison: 'PP',
  offer_writing: 'PN',
  profile_optimization: 'OP',
}

const GREETING_MESSAGES: Record<AgentType, string> = {
  work_description:
    'Pozdravljeni! Pomagam vam pri strukturiranju opisa del. Opišite delo, ki ga potrebujete, in jaz vam bom pomagal, da bo opis jasen in privlačen za ponudnike.',
  offer_comparison:
    'Pozdravljeni! Pomagam vam pri primerjavi ponudb. Prilepite besedila ponudb, ki ste jih prejeli, in jaz vam bom pomagal pri analizi in primerjavi.',
  offer_writing:
    'Pozdravljeni! Pomagam vam pri pisanju profesionalnih ponudb. Povedajte mi o povpraševanju, ki ste ga prejeli, in jaz vam bom pomagal pri optimalni ponudbi.',
  profile_optimization:
    'Pozdravljeni! Pomagam vam pri optimizaciji profila za več poslovanja. Skupaj lahko izboljšamo vidnost vašega profila in privabimo več strank.',
}

function ContextCard({ type, title, location, urgency, budget, details }: ContextCardProps) {
  return (
    <div className="border-b bg-slate-50 p-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {type === 'inquiry' ? '📋 Povpraševanje' : '📊 Ponudba'}
          </p>
          <h3 className="mt-1 font-semibold text-slate-900">{title}</h3>
        </div>

        {(location || urgency || budget) && (
          <div className="space-y-2">
            {location && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span>📍</span>
                <span>{location}</span>
              </div>
            )}
            {urgency && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span>⏰</span>
                <span>{urgency}</span>
              </div>
            )}
            {budget && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span>💰</span>
                <span>{budget}</span>
              </div>
            )}
          </div>
        )}

        {details && details.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {details.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-600">{detail.label}</span>
                <span className="font-medium text-slate-900">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  agentIcon,
}: {
  key?: React.Key
  message: ChatMessage
  agentIcon: React.ReactNode
}) {
  const isAgent = message.role === 'agent'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="flex max-w-md items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-center">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', isAgent ? 'justify-start' : 'justify-end')}>
      {isAgent && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            {AGENT_INITIALS[AGENT_TITLES.work_description as AgentType] || 'AI'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex max-w-xs flex-col gap-1', !isAgent && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isAgent ? 'bg-blue-50 text-slate-900' : 'bg-slate-200 text-slate-900'
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              <span className="text-sm text-slate-600">Razmišljam...</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          )}
        </div>
        <span className="px-2 text-xs text-slate-500">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>

      {!isAgent && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-slate-300 text-slate-700">VI</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-blue-100 text-blue-600">AI</AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl bg-blue-50 px-4 py-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.1s' }} />
        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  )
}

export function AgentChatDialog({
  agentType,
  agentTitle,
  agentIcon,
  contextCard,
  onClose,
  onSendMessage,
}: AgentChatDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>('open')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'agent',
      content: GREETING_MESSAGES[agentType],
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  const handleFinalTranscript = useCallback((text: string) => {
    setInputValue((prev) => (prev ? `${prev} ${text}` : text))
  }, [])

  const { start: startSTT, stop: stopSTT, isListening, isSupported: sttSupported } = useSpeechToText({
    language: 'sl',
    onFinalTranscript: handleFinalTranscript,
  })

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !attachmentUrl) return

    const messageContent = [
      inputValue.trim(),
      attachmentUrl ? `[Priponka: ${attachmentName || attachmentUrl}]` : '',
    ].filter(Boolean).join('\n')

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    clearAttachment()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    setIsTyping(true)

    try {
      if (onSendMessage) {
        await onSendMessage(messageContent)
      }

      setTimeout(() => {
        const agentMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'agent',
          content: 'Hvala za vaš prispevek! To je odličen vir informacij. Kako bi rad nadaljevali?',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, agentMessage])
        setIsTyping(false)
      }, 1500)
    } catch (error) {
      console.error('[AgentChatDialog] Error sending message:', error)
      setIsTyping(false)
    }
  }

  const handleMicClick = async () => {
    setUploadError(null)
    if (isListening) { stopSTT(); return }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      startSTT()
    } catch {
      setUploadError('Mikrofon ni dostopen. Preverite dovoljenja brskalnika.')
    }
  }

  const startAudioRecording = async () => {
    setUploadError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      audioChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        audioStreamRef.current = null
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4'
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
        setIsLoading(true)
        try {
          const path = generateFilePath('chat', file.name)
          const { url, error } = await uploadFile('chat-attachments', path, file)
          if (url) {
            setAttachmentUrl(url)
            setAttachmentName('Glasovni posnetek')
          } else {
            setUploadError(error || 'Nalaganje ni uspelo.')
          }
        } finally {
          setIsLoading(false)
        }
      }
      recorder.start()
      setIsRecordingAudio(true)
    } catch {
      setUploadError('Mikrofon ni dostopen. Preverite dovoljenja brskalnika.')
    }
  }

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecordingAudio(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Nepodprt tip datoteke.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsLoading(true)
    try {
      const path = generateFilePath('chat', file.name)
      const { url, error } = await uploadFile('chat-attachments', path, file)
      if (url) {
        setAttachmentUrl(url)
        setAttachmentName(file.name)
      } else {
        setUploadError(error || 'Nalaganje datoteke ni uspelo.')
      }
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearAttachment = () => {
    setAttachmentUrl(null)
    setAttachmentName(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (dialogState === 'minimized') {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setDialogState('open')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg transition-all hover:bg-blue-700"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{agentTitle}</span>
        </button>
      </div>
    )
  }

  if (dialogState === 'closed') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 flex flex-col rounded-lg border bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            {agentIcon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{agentTitle}</h3>
            <p className="text-xs text-slate-500">Agenta je spreman pomagati</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setDialogState('minimized')}
            className="rounded p-1 hover:bg-slate-100"
            title="Minimiziraj"
          >
            <Minimize2 className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={() => {
              setDialogState('closed')
              onClose()
            }}
            className="rounded p-1 hover:bg-slate-100"
            title="Zatvori"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Context Card */}
      {contextCard && <ContextCard {...contextCard} />}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <MessageCircle className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Klepet je prazen</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} agentIcon={agentIcon} />
              ))}
              {isTyping && <TypingIndicator />}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-slate-50 p-4">
        <div className="space-y-2">
          {attachmentUrl && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Paperclip className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-xs text-blue-700 flex-1 truncate">{attachmentName}</span>
              <button
                type="button"
                onClick={clearAttachment}
                className="text-blue-600 hover:text-blue-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-red-600 px-1">{uploadError}</p>
          )}
          {isRecordingAudio && (
            <p className="text-xs font-medium text-red-600 px-1 animate-pulse">Snemate... kliknite stop za zaključek</p>
          )}
          {isListening && (
            <p className="text-xs font-medium text-emerald-600 px-1 animate-pulse">Poslušam... govorite</p>
          )}
          <div className="flex gap-2">
            {/* File attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded p-2 transition"
              disabled={isLoading || isRecordingAudio}
              title="Priloži datoteko (slika, video, avdio, PDF)"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Audio record */}
            <button
              type="button"
              onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
              disabled={isLoading || isListening}
              title={isRecordingAudio ? 'Ustavi snemanje' : 'Posnemite glasovno sporočilo'}
              className={cn(
                'rounded p-2 transition',
                isRecordingAudio
                  ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {isRecordingAudio ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
            </button>
            {/* Speech-to-text mic */}
            {sttSupported && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading || isRecordingAudio}
                title={isListening ? 'Ustavi poslušanje' : 'Govorno vnašanje (pretvorba v besedilo)'}
                className={cn(
                  'rounded p-2 transition',
                  isListening
                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 animate-pulse'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Mic className={cn('h-5 w-5', isListening && 'text-emerald-600')} />
              </button>
            )}
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Napišite sporočilo..."
              disabled={isLoading}
              className="min-h-[44px] max-h-24 resize-none border border-slate-200 bg-white flex-1"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !attachmentUrl) || isLoading}
              size="icon"
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export a demo component for testing
export function AgentChatDialogDemo() {
  const [isOpen, setIsOpen] = useState(true)

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
        >
          Odpri Agent Chat
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full bg-slate-50">
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="mb-8 text-3xl font-bold">Agent Chat Dialog Demo</h1>

        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Pomoč pri opisu dela</h2>
            <AgentChatDialog
              agentType="work_description"
              agentTitle="Pomoč pri opisu dela"
              agentIcon={<MessageCircle className="h-4 w-4" />}
              contextCard={{
                type: 'inquiry',
                title: 'Popravilo curka v kopalnici',
                location: 'Ljubljana',
                urgency: 'Ta teden',
                budget: '150-200€',
              }}
              onClose={handleClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
