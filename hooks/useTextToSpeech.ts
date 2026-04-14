'use client'

import { useMemo } from 'react'
import type { ConciergeLanguage } from '@/hooks/useLanguage'

const speechLangMap: Record<ConciergeLanguage, string> = {
  sl: 'sl-SI',
  en: 'en-US',
  hr: 'hr-HR',
  de: 'de-DE',
  it: 'it-IT',
}

export function useTextToSpeech(language: ConciergeLanguage) {
  const supported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, [])

  const speak = (text: string) => {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLangMap[language]
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => {
    if (!supported) return
    window.speechSynthesis.cancel()
  }

  return {
    supported,
    speak,
    stop,
  }
}
