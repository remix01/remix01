'use client'

import { useEffect, useRef, useState } from 'react'
import { CONCIERGE_SPEECH_LOCALES, type ConciergeLanguage } from '@/lib/ai/concierge-types'

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onspeechend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean
    length: number
    [index: number]: { transcript: string }
  }>
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
}

interface UseSpeechToTextOptions {
  language: ConciergeLanguage
  silenceMs?: number
  onFinalTranscript: (text: string) => void
  onSpeechEnd?: () => void
}

export function useSpeechToText({ language, onFinalTranscript, onSpeechEnd, silenceMs = 1500 }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptRef = useRef('')
  // Keep latest callbacks in refs so the effect never needs to re-run due to inline functions
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  const onSpeechEndRef = useRef(onSpeechEnd)
  useEffect(() => { onFinalTranscriptRef.current = onFinalTranscript }, [onFinalTranscript])
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd }, [onSpeechEnd])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()
    recognition.lang = CONCIERGE_SPEECH_LOCALES[language]
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i]
        const text = res[0]?.transcript || ''
        if (res.isFinal) {
          final += `${text} `
        } else {
          interim += `${text} `
        }
      }

      const normalizedFinal = final.trim()
      const normalizedInterim = interim.trim()

      if (normalizedInterim) setInterimTranscript(normalizedInterim)
      if (normalizedFinal) {
        setTranscript((prev) => {
          const nextTranscript = `${prev} ${normalizedFinal}`.trim()
          transcriptRef.current = nextTranscript
          return nextTranscript
        })
      }

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop()
      }, silenceMs)
    }

    recognition.onspeechend = () => {
      onSpeechEndRef.current?.()
    }

    recognition.onerror = (event) => {
      setError(event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      setIsListening(false)
      setInterimTranscript('')
      const text = transcriptRef.current.trim()
      if (text) {
        onFinalTranscriptRef.current(text)
        transcriptRef.current = ''
        setTranscript('')
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      recognition.stop()
    }
  }, [language, silenceMs])

  const start = () => {
    setError(null)
    transcriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    try {
      recognitionRef.current?.start()
      setIsListening(true)
    } catch (err) {
      setIsListening(false)
      setError(err instanceof Error ? err.message : 'speech-start-failed')
    }
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return {
    start,
    stop,
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
  }
}
