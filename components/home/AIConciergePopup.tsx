'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Bot, Mic, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type VoiceRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type VoiceRecognitionCtor = new () => VoiceRecognition

interface ConciergeResponse {
  category: string
  estimateMin: number
  estimateMax: number
}

export function AIConciergePopup() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConciergeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<VoiceRecognition | null>(null)

  const handleAnalyze = async () => {
    if (!message.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Analiza trenutno ni na voljo. Poskusite znova čez trenutek.')
        return
      }
      setResult(data)
    } catch {
      setError('Povezava z AI Concierge trenutno ni na voljo. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceToggle = () => {
    if (typeof window === 'undefined') return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: VoiceRecognitionCtor
      webkitSpeechRecognition?: VoiceRecognitionCtor
    }

    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError('Glasovni vnos ni podprt na tej napravi/brskalniku.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'sl-SI'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || '')
        .join(' ')
        .trim()

      if (transcript) {
        setMessage(transcript)
      }
    }

    recognition.onerror = () => {
      setError('Glasovni vnos ni uspel. Preverite dovoljenja za mikrofon.')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    setError(null)
    setIsListening(true)
    recognition.start()
  }

  const href = result
    ? `/povprasevanje/novo?kategorija=${encodeURIComponent(result.category)}&opis=${encodeURIComponent(message)}`
    : '/povprasevanje/novo'

  return (
    <div className="fixed bottom-6 right-4 z-40 w-[min(92vw,360px)] rounded-2xl border bg-card p-4 shadow-xl">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Bot className="h-4 w-4 text-primary" />
        AI Concierge
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Kaj potrebujete? Napišite ali povejte…</p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          className="h-11"
          placeholder="Npr. pušča pipa v kopalnici"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleAnalyze()
            }
          }}
        />
        <Button
          type="button"
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={isListening ? 'Ustavi glasovni vnos' : 'Začni glasovni vnos'}
          onClick={handleVoiceToggle}
        >
          {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>
      <Button className="mt-3 h-11 w-full" onClick={handleAnalyze} disabled={loading}>
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? 'Analiziram…' : 'Predlagaj kategorijo'}
      </Button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <p><strong>Kategorija:</strong> {result.category}</p>
          <p>
            <strong>Okvirna cena:</strong> {result.estimateMin}€–{result.estimateMax}€
          </p>
          <Button asChild className="mt-3 h-10 w-full" variant="outline">
            <Link href={href}>Nadaljuj na obrazec</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
