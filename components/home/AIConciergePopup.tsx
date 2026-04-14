'use client'

import { useMemo, useRef, useState } from 'react'
import { Bot, Globe, Mic, Paperclip, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useLanguage } from '@/hooks/useLanguage'
import { generateFilePath, uploadFile } from '@/lib/storage'
import type { ConciergeLanguage } from '@/lib/ai/concierge-types'

type WidgetLanguage = 'sl' | 'en'

const I18N: Record<WidgetLanguage, Record<string, string>> = {
  sl: {
    title: 'LiftGO AI Pomočnik',
    subtitle: 'Hitro oddajte povpraševanje z glasom ali besedilom',
    placeholder: 'Opišite težavo ali storitev, ki jo potrebujete...',
    listening: 'Poslušam...',
    submit: 'Pošlji povpraševanje',
    success: 'Hvala! Povpraševanje poslano. Obrtniki vas bodo kontaktirali.',
    speechUnavailable: 'Brskalnik ne podpira govornega vnosa.',
    micDenied: 'Mikrofon ni dovoljen. Če je widget v iframe, dodajte allow="microphone".',
    uploadError: 'Nalaganje datoteke ni uspelo. Poskusite znova.',
    genericError: 'Prišlo je do napake. Poskusite znova.',
    aiReplyTitle: 'AI odgovor',
    speakReply: 'Preberi odgovor',
    languageLabel: 'Slo/Eng',
    open: 'Odpri LiftGO Concierge',
    close: 'Zapri LiftGO Concierge',
  },
  en: {
    title: 'LiftGO Concierge',
    subtitle: 'Quickly submit your request by voice or text',
    placeholder: 'Describe the issue or service you need...',
    listening: 'Listening...',
    submit: 'Send inquiry',
    success: 'Thank you! Inquiry sent. Professionals will contact you.',
    speechUnavailable: 'Speech recognition is not supported in this browser.',
    micDenied: 'Microphone permission denied. If embedded in iframe, add allow="microphone".',
    uploadError: 'File upload failed. Please try again.',
    genericError: 'Something went wrong. Please try again.',
    aiReplyTitle: 'AI response',
    speakReply: 'Read answer',
    languageLabel: 'Slo/Eng',
    open: 'Open LiftGO Concierge',
    close: 'Close LiftGO Concierge',
  },
}

export function AIConciergePopup() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [assistantReply, setAssistantReply] = useState<string | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { language, setLanguage } = useLanguage('sl')
  const activeLanguage: WidgetLanguage = language === 'en' ? 'en' : 'sl'
  const t = I18N[activeLanguage]
  const { supported: ttsSupported, speak } = useTextToSpeech(activeLanguage)

  const speechLanguage: ConciergeLanguage = activeLanguage
  const { start, stop, isListening, interimTranscript, isSupported } = useSpeechToText({
    language: speechLanguage,
    onFinalTranscript: (text) => setInput(text),
  })

  const quickChips = useMemo(
    () =>
      activeLanguage === 'sl'
        ? ['Pušča cev', 'Pleskanje 20m2', 'Montaža klime', 'Popravilo strehe']
        : ['Leaking pipe', 'Painting 20m2', 'AC installation', 'Roof repair'],
    [activeLanguage]
  )

  const handleMicClick = async () => {
    setErrorMessage(null)

    if (isListening) {
      stop()
      return
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      start()
    } catch {
      setErrorMessage(t.micDenied)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setIsUploading(true)

    try {
      const path = generateFilePath('ai-concierge', file.name)
      const { url, error } = await uploadFile('inquiry-attachments', path, file)

      if (!url || error) {
        setErrorMessage(t.uploadError)
        return
      }

      setAttachmentUrl(url)
      setAttachmentName(file.name)
      setAttachmentPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview)
    }
    setAttachmentPreview(null)
    setAttachmentName(null)
    setAttachmentUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submitInquiry = async () => {
    const query = input.trim()
    if (!query || isSubmitting) return

    setStatusMessage(null)
    setErrorMessage(null)
    setAssistantReply(null)
    setIsSubmitting(true)

    try {
      const payload = {
        query,
        message: query,
        language,
        attachments: attachmentUrl ? [attachmentUrl] : [],
        imageUrl: attachmentUrl || undefined,
        source: 'ai_concierge_widget',
      }

      const response = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Submit failed')
      }

      const data = await response.json().catch(() => ({}))
      const reply = typeof data.message === 'string' ? data.message : ''
      setAssistantReply(reply || null)
      setStatusMessage(t.success)
      setInput('')
      removeAttachment()
    } catch {
      setErrorMessage(t.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(96vw,430px)]">
      {!open && (
        <Button
          aria-label={t.open}
          className="ml-auto h-12 rounded-full bg-primary px-5 text-white shadow-lg hover:bg-[#059669]"
          onClick={() => setOpen(true)}
        >
          <Bot className="mr-2 h-4 w-4" />
          LiftGO Concierge
        </Button>
      )}

      {open && (
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Bot className="h-5 w-5 text-[#10B981]" />
                {t.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t.subtitle}</p>
            </div>
            <Button aria-label={t.close} variant="ghost" size="icon" className="h-10 w-10" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="min-h-10 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
                onClick={() => setInput(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <textarea
            aria-label="LiftGO concierge input"
            className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-emerald-500"
            placeholder={interimTranscript || t.placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 min-w-12"
                onClick={() => setLanguage(activeLanguage === 'sl' ? 'en' : 'sl')}
              >
                <Globe className="mr-1 h-4 w-4" />
                {t.languageLabel}
              </Button>

              <Button type="button" variant="outline" className="h-12 min-w-12" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <Button
              type="button"
              aria-label="microphone"
              variant="outline"
              className={cn(
                'h-12 min-w-12 rounded-full border-2',
                isListening && 'animate-pulse border-emerald-500 text-emerald-600'
              )}
              onClick={handleMicClick}
              disabled={!isSupported}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>

          {isListening && <p className="mt-2 text-xs font-medium text-emerald-600">{t.listening}</p>}
          {!isSupported && <p className="mt-2 text-xs text-amber-600">{t.speechUnavailable}</p>}

          {attachmentUrl && (
            <div className="mt-3 relative w-fit rounded-xl border border-slate-200 p-2">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="Attachment preview" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <p className="max-w-52 text-xs text-slate-600">{attachmentName}</p>
              )}
              <button
                type="button"
                aria-label="Remove attachment"
                className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white"
                onClick={removeAttachment}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {(errorMessage || statusMessage || isUploading) && (
            <p className={cn('mt-3 text-xs', errorMessage ? 'text-red-600' : 'text-emerald-700')}>
              {isUploading ? 'Nalagam datoteko...' : errorMessage || statusMessage}
            </p>
          )}

          {assistantReply && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-emerald-800">{t.aiReplyTitle}</p>
                {ttsSupported && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-emerald-200 bg-white text-emerald-700"
                    onClick={() => speak(assistantReply)}
                  >
                    <Volume2 className="mr-1 h-3.5 w-3.5" />
                    {t.speakReply}
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-emerald-900">{assistantReply}</p>
            </div>
          )}

          <Button
            type="button"
            className="mt-4 h-12 w-full bg-primary text-white hover:bg-[#059669]"
            onClick={submitInquiry}
            disabled={isSubmitting || isUploading || !input.trim()}
          >
            {isSubmitting ? '....' : t.submit}
          </Button>
        </div>
      )}
    </div>
  )
}
