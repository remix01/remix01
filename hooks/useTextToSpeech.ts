'use client'

import { useEffect, useMemo } from 'react'
import { CONCIERGE_SPEECH_LOCALES, type ConciergeLanguage } from '@/lib/ai/concierge-types'

export function useTextToSpeech(language: ConciergeLanguage) {
  const supported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, [])

  const speak = (text: string) => {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = CONCIERGE_SPEECH_LOCALES[language]
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => {
    if (!supported) return
    window.speechSynthesis.cancel()
  }

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel()
      }
    }
  }, [supported])

  return {
    supported,
    speak,
    stop,
  }
}
