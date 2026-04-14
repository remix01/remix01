'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Globe, Mic, Paperclip, Send, Settings2, Sparkles, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useLanguage, type ConciergeLanguage } from '@/hooks/useLanguage'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  agents?: string[]
}

const I18N: Record<ConciergeLanguage, Record<string, string>> = {
  sl: {
    title: 'Brutal AI Concierge',
    subtitle: 'Glasovno, večjezično in samodejno vodenje povpraševanja',
    placeholder: 'Npr. Koliko stane polaganje ploščic v kopalnici 10m2?',
    send: 'Pošlji',
    listening: 'Poslušam…',
    autoSend: 'Samodejno pošlji',
    manualSend: 'Ročno pošiljanje',
    submitInquiry: 'Oddaj povpraševanje',
    attach: 'Priloži URL slike',
    noSpeech: 'Brskalnik ne podpira govornega vnosa',
    cancel: 'Prekliči',
  },
  en: {
    title: 'Brutal AI Concierge', subtitle: 'Voice-first, multilingual autonomous intake', placeholder: 'e.g. How much to tile a 10m2 bathroom?',
    send: 'Send', listening: 'Listening…', autoSend: 'Auto-send', manualSend: 'Manual send', submitInquiry: 'Submit inquiry', attach: 'Attach image URL', noSpeech: 'Speech recognition not supported', cancel: 'Cancel',
  },
  hr: {
    title: 'Brutal AI Concierge', subtitle: 'Glasovno i višejezično automatsko zaprimanje', placeholder: 'npr. Koliko košta polaganje pločica u kupaonici 10m2?',
    send: 'Pošalji', listening: 'Slušam…', autoSend: 'Auto-slati', manualSend: 'Ručno slanje', submitInquiry: 'Pošalji upit', attach: 'Dodaj URL slike', noSpeech: 'Govor nije podržan', cancel: 'Odustani',
  },
  de: {
    title: 'Brutal AI Concierge', subtitle: 'Sprachgesteuerter, mehrsprachiger Einstieg', placeholder: 'z.B. Was kostet Fliesenlegen im Bad 10m2?',
    send: 'Senden', listening: 'Ich höre…', autoSend: 'Automatisch senden', manualSend: 'Manuell senden', submitInquiry: 'Anfrage senden', attach: 'Bild-URL anhängen', noSpeech: 'Spracheingabe nicht verfügbar', cancel: 'Abbrechen',
  },
  it: {
    title: 'Brutal AI Concierge', subtitle: 'Interfaccia vocale multilingue autonoma', placeholder: 'es. Quanto costa posare piastrelle bagno 10m2?',
    send: 'Invia', listening: 'In ascolto…', autoSend: 'Invio automatico', manualSend: 'Invio manuale', submitInquiry: 'Invia richiesta', attach: 'Allega URL immagine', noSpeech: 'Riconoscimento vocale non supportato', cancel: 'Annulla',
  },
}

export function AIConciergePopup() {
  const { language, setLanguage, availableLanguages } = useLanguage()
  const t = I18N[language]
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSend, setAutoSend] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null)
  const lockRef = useRef(false)

  useEffect(() => {
    const key = '__liftgo_concierge_mounted__'
    const win = window as unknown as Window & { __liftgo_concierge_mounted__?: boolean }
    if (win[key]) {
      lockRef.current = true
      return
    }
    win[key] = true
    return () => {
      win[key] = false
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 4000 }
    )
  }, [])

  const sendMessage = async (value = input) => {
    const message = value.trim()
    if (!message || loading) return

    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: 'user', text: message }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language, imageUrl: imageUrl || undefined, location }),
      })
      const data = await res.json()
      setLanguage(data.language || language)
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          text: data.message || 'AI response unavailable.',
          agents: data.usedAgents,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const triggerAutoSend = (text: string) => {
    if (!autoSend) {
      setInput(text)
      return
    }

    setInput(text)
    setCountdown(1)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(timer)
          sendMessage(text)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const { start, stop, isListening, interimTranscript, isSupported } = useSpeechToText({
    language,
    onFinalTranscript: (text) => triggerAutoSend(text),
    onSpeechEnd: () => {
      if (autoSend) setCountdown(1)
    },
    silenceMs: 1500,
  })

  const { supported: ttsSupported, speak } = useTextToSpeech(language)

  const quickChips = useMemo(
    () => [
      'Koliko stane?',
      'Pušča cev v kuhinji',
      'Potrebujem termin ta teden',
      'Primerjaj prejete ponudbe',
    ],
    []
  )

  if (lockRef.current) return null

  return (
    <div className="fixed bottom-6 right-4 z-40 w-[min(94vw,430px)] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bot className="h-4 w-4 text-primary" />
            {t.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button aria-label="settings" variant="ghost" size="icon" onClick={() => setSettingsOpen((v) => !v)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {settingsOpen && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span>{autoSend ? t.autoSend : t.manualSend}</span>
            <Switch aria-label="Auto send toggle" checked={autoSend} onCheckedChange={setAutoSend} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" />
            <select
              aria-label="Language selector"
              className="h-8 rounded border bg-background px-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {availableLanguages.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('rounded-lg p-2 text-sm', msg.role === 'assistant' ? 'bg-muted/60' : 'bg-primary/10')}>
            <p>{msg.text}</p>
            {msg.agents?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.agents.map((agent) => (
                  <Badge key={agent} variant="secondary" className="text-[10px]">{agent}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          aria-label="Concierge message input"
          className="h-11"
          placeholder={interimTranscript || t.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
            if (e.key === 'Escape') setCountdown(null)
          }}
        />
        <Button
          aria-label="microphone"
          variant={isListening ? 'destructive' : 'secondary'}
          className="relative h-11 w-11 p-0"
          onClick={() => {
            if (isListening) stop()
            else start()
          }}
          disabled={!isSupported}
        >
          <Mic className="h-4 w-4" />
          {countdown !== null ? (
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-primary">
              Pošiljam čez {countdown}s
            </span>
          ) : null}
        </Button>
        {!autoSend && (
          <Button aria-label="send" className="h-11" onClick={() => sendMessage()} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isSupported && <p className="mt-2 text-xs text-amber-600">{t.noSpeech}</p>}
      {isListening && <p className="mt-2 text-xs text-muted-foreground">{t.listening}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {quickChips.map((chip) => (
          <button
            key={chip}
            className="rounded-full border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => {
              setInput(chip)
              if (autoSend) sendMessage(chip)
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          aria-label="image-url"
          placeholder={t.attach}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="h-9"
        />
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        {countdown !== null && (
          <Button size="sm" variant="ghost" onClick={() => setCountdown(null)} aria-label={t.cancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button asChild variant="outline" className="h-10 flex-1">
          <Link href="/povprasevanje/novo">{t.submitInquiry}</Link>
        </Button>
        <Button
          aria-label="read last response"
          variant="outline"
          className="h-10"
          onClick={() => ttsSupported && messages.filter((m) => m.role === 'assistant').at(-1) && speak(messages.filter((m) => m.role === 'assistant').at(-1)?.text || '')}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
        <Button aria-label="spark" variant="outline" className="h-10" onClick={() => sendMessage('Koliko bi stala storitev po mojem opisu?')}>
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
