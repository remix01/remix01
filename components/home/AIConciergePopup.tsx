'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Globe, Mic, MicOff, Paperclip, Square, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useLanguage } from '@/hooks/useLanguage'
import { generateFilePath, uploadFile, validateFile } from '@/lib/storage'
import type { ConciergeLanguage } from '@/lib/ai/concierge-types'

type WidgetLanguage = 'sl' | 'en'

const I18N: Record<WidgetLanguage, Record<string, string>> = {
  sl: {
    title: 'LiftGO AI Pomočnik',
    subtitle: 'Vprašajte za nasvet ali pomoč pri oddaji povpraševanja',
    placeholder: 'Opišite težavo ali storitev, ki jo potrebujete...',
    listening: 'Poslušam... (kliknite za zaustavitev)',
    recording: 'Snemate zvok... (kliknite za zaustavitev)',
    submit: 'Vprašaj AI',
    speechUnavailable: 'Brskalnik ne podpira govornega vnosa.',
    micDenied: 'Mikrofon ni dovoljen. Prosim dovolite dostop do mikrofona.',
    uploadError: 'Nalaganje datoteke ni uspelo. Poskusite znova.',
    uploadValidationError: 'Nepodprt tip ali prevelika datoteka.',
    genericError: 'Prišlo je do napake. Poskusite znova.',
    uploading: 'Nalagam datoteko...',
    thinking: 'Pripravljam odgovor...',
    tipsLabel: 'Namig:',
    tipsText: 'Dodajte lokacijo, okvirni proračun in nujnost za bolj natančen odgovor.',
    aiReplyTitle: 'AI odgovor',
    speakReply: 'Preberi odgovor',
    languageLabel: 'Slo/Eng',
    open: 'Odpri LiftGO Concierge',
    close: 'Zapri LiftGO Concierge',
    attachFile: 'Priloži datoteko (slika, video, avdio)',
    recordAudio: 'Posnemite glasovno sporočilo',
    stopRecording: 'Ustavi snemanje',
    speechInput: 'Govorno vnašanje (pretvorba v besedilo)',
    audioRecorded: 'Zvočni posnetek pripravljen',
  },
  en: {
    title: 'LiftGO Concierge',
    subtitle: 'Ask for advice or help with submitting a request',
    placeholder: 'Describe the issue or service you need...',
    listening: 'Listening... (click to stop)',
    recording: 'Recording audio... (click to stop)',
    submit: 'Ask AI',
    speechUnavailable: 'Speech recognition is not supported in this browser.',
    micDenied: 'Microphone permission denied. Please allow microphone access.',
    uploadError: 'File upload failed. Please try again.',
    uploadValidationError: 'Unsupported file type or file too large.',
    genericError: 'Something went wrong. Please try again.',
    uploading: 'Uploading file...',
    thinking: 'Preparing response...',
    tipsLabel: 'Tip:',
    tipsText: 'Include location, rough budget, and urgency for a more accurate answer.',
    aiReplyTitle: 'AI response',
    speakReply: 'Read answer',
    languageLabel: 'Slo/Eng',
    open: 'Open LiftGO Concierge',
    close: 'Close LiftGO Concierge',
    attachFile: 'Attach file (image, video, audio)',
    recordAudio: 'Record a voice message',
    stopRecording: 'Stop recording',
    speechInput: 'Speech input (convert to text)',
    audioRecorded: 'Audio recording ready',
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
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'audio' | 'file' | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { language, setLanguage } = useLanguage('sl')
  const activeLanguage: WidgetLanguage = language === 'en' ? 'en' : 'sl'
  const t = I18N[activeLanguage]
  const { supported: ttsSupported, speak } = useTextToSpeech(activeLanguage)

  const speechLanguage: ConciergeLanguage = activeLanguage
  const handleFinalTranscript = useCallback((text: string) => setInput(text), [])
  const { start, stop, isListening, interimTranscript, isSupported } = useSpeechToText({
    language: speechLanguage,
    onFinalTranscript: handleFinalTranscript,
  })

  const quickChips = useMemo(
    () =>
      activeLanguage === 'sl'
        ? ['Pušča cev', 'Pleskanje 20m2', 'Montaža klime', 'Popravilo strehe']
        : ['Leaking pipe', 'Painting 20m2', 'AC installation', 'Roof repair'],
    [activeLanguage]
  )

  useEffect(() => {
    const openFromIntent = () => {
      setOpen(true)
      window.localStorage.removeItem('liftgo:open-concierge')
    }

    if (window.localStorage.getItem('liftgo:open-concierge') === '1') {
      openFromIntent()
    }

    const handler = () => openFromIntent()
    window.addEventListener('liftgo:open-concierge', handler as EventListener)
    return () => window.removeEventListener('liftgo:open-concierge', handler as EventListener)
  }, [])

  // Stop audio recording stream on unmount/close
  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleMicClick = async () => {
    setErrorMessage(null)

    if (isListening) {
      stop()
      return
    }

    // Stop audio recording if active
    if (isRecordingAudio) {
      stopAudioRecording()
      return
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      start()
    } catch {
      setErrorMessage(t.micDenied)
    }
  }

  const startAudioRecording = async () => {
    setErrorMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      audioChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        audioStreamRef.current = null

        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4'
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })

        setIsUploading(true)
        try {
          const path = generateFilePath('ai-concierge', file.name)
          const { url, error } = await uploadFile('inquiry-attachments', path, file)
          if (!url || error) {
            setErrorMessage(t.uploadError)
          } else {
            setAttachmentUrl(url)
            setAttachmentName(t.audioRecorded)
            setAttachmentType('audio')
            setAttachmentPreview(null)
          }
        } finally {
          setIsUploading(false)
        }
      }

      recorder.start()
      setIsRecordingAudio(true)
    } catch {
      setErrorMessage(t.micDenied)
    }
  }

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecordingAudio(false)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage(null)

    const validation = validateFile(file)
    if (!validation.valid) {
      setErrorMessage(validation.error || t.uploadValidationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)

    try {
      const path = generateFilePath('ai-concierge', file.name)
      const { url, error } = await uploadFile('inquiry-attachments', path, file)

      if (!url || error) {
        setErrorMessage(t.uploadError)
        return
      }

      const mediaType = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'file'

      setAttachmentUrl(url)
      setAttachmentName(file.name)
      setAttachmentType(mediaType)
      setAttachmentPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentPreview(null)
    setAttachmentName(null)
    setAttachmentUrl(null)
    setAttachmentType(null)
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
        imageUrl: attachmentType === 'image' ? attachmentUrl : undefined,
        source: 'ai_concierge_widget',
      }

      const response = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Submit failed')

      const data = await response.json().catch(() => ({}))
      const reply = typeof data.message === 'string' ? data.message : ''
      setAssistantReply(reply || null)
      setStatusMessage(null)
      setInput('')
      removeAttachment()
    } catch {
      setErrorMessage(t.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-x-2 bottom-2 z-40 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(96vw,430px)]">
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
        <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-lg sm:max-h-[80vh]">
          {/* Header */}
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

          {/* Quick chips */}
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

          {/* Text input */}
          <textarea
            aria-label="LiftGO concierge input"
            className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-emerald-500"
            placeholder={interimTranscript || t.placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void submitInquiry()
              }
            }}
          />

          <p className="mt-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{t.tipsLabel}</span> {t.tipsText}
          </p>

          {/* Action bar */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <Button
                type="button"
                variant="outline"
                className="h-12 min-w-12"
                onClick={() => setLanguage(activeLanguage === 'sl' ? 'en' : 'sl')}
              >
                <Globe className="mr-1 h-4 w-4" />
                {t.languageLabel}
              </Button>

              {/* File attach */}
              <Button
                type="button"
                variant="outline"
                className="h-12 min-w-12"
                title={t.attachFile}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isRecordingAudio}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Audio record button */}
              <Button
                type="button"
                variant="outline"
                title={isRecordingAudio ? t.stopRecording : t.recordAudio}
                className={cn(
                  'h-12 min-w-12',
                  isRecordingAudio && 'animate-pulse border-red-500 text-red-600'
                )}
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                disabled={isListening || isUploading}
              >
                {isRecordingAudio ? <Square className="h-5 w-5 fill-current" /> : <MicOff className="h-5 w-5" />}
              </Button>
            </div>

            {/* Speech-to-text mic */}
            <Button
              type="button"
              aria-label="microphone"
              variant="outline"
              title={t.speechInput}
              className={cn(
                'h-12 min-w-12 rounded-full border-2',
                isListening && 'animate-pulse border-emerald-500 text-emerald-600'
              )}
              onClick={handleMicClick}
              disabled={!isSupported || isRecordingAudio || isUploading}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>

          {/* Status messages */}
          {isListening && <p className="mt-2 text-xs font-medium text-emerald-600">{t.listening}</p>}
          {isRecordingAudio && <p className="mt-2 text-xs font-medium text-red-600">{t.recording}</p>}
          {!isSupported && <p className="mt-2 text-xs text-amber-600">{t.speechUnavailable}</p>}

          {/* Attachment preview */}
          {(attachmentUrl || isUploading) && (
            <div className="mt-3 relative w-fit rounded-xl border border-slate-200 p-2">
              {isUploading ? (
                <p className="text-xs text-slate-500">{t.uploading}</p>
              ) : attachmentType === 'image' && attachmentPreview ? (
                <img src={attachmentPreview} alt="Attachment preview" className="h-20 w-20 rounded-lg object-cover" />
              ) : attachmentType === 'audio' ? (
                <div className="flex items-center gap-2 px-2">
                  <Mic className="h-4 w-4 text-emerald-600" />
                  <p className="max-w-52 text-xs text-slate-600">{attachmentName}</p>
                </div>
              ) : (
                <p className="max-w-52 text-xs text-slate-600">{attachmentName}</p>
              )}
              {!isUploading && (
                <button
                  type="button"
                  aria-label="Remove attachment"
                  className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white"
                  onClick={removeAttachment}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <p className="mt-3 text-xs text-red-600">{errorMessage}</p>
          )}

          {/* AI reply */}
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
            {isSubmitting ? t.thinking : t.submit}
          </Button>
        </div>
      )}
    </div>
  )
}
