'use client'

import { useMemo, useState } from 'react'

export type ConciergeLanguage = 'sl' | 'en' | 'hr' | 'de' | 'it'

const SUPPORTED: ConciergeLanguage[] = ['sl', 'en', 'hr', 'de', 'it']

function normalizeLanguage(input?: string | null): ConciergeLanguage {
  const base = String(input || '').toLowerCase().split('-')[0]
  if (SUPPORTED.includes(base as ConciergeLanguage)) {
    return base as ConciergeLanguage
  }

  if (base === 'sl') return 'sl'
  if (base === 'en') return 'en'
  if (base === 'hr') return 'hr'
  if (base === 'de') return 'de'
  if (base === 'it') return 'it'

  return 'sl'
}

export function useLanguage(initial?: string) {
  const [language, setLanguage] = useState<ConciergeLanguage>(() => {
    if (initial) return normalizeLanguage(initial)
    if (typeof navigator !== 'undefined') {
      return normalizeLanguage(navigator.language)
    }
    return 'sl'
  })

  const setResolvedLanguage = (next: string) => setLanguage(normalizeLanguage(next))

  const availableLanguages = useMemo(
    () => [
      { code: 'sl' as const, label: 'Slovenščina' },
      { code: 'en' as const, label: 'English' },
      { code: 'hr' as const, label: 'Hrvatski' },
      { code: 'de' as const, label: 'Deutsch' },
      { code: 'it' as const, label: 'Italiano' },
    ],
    []
  )

  return {
    language,
    setLanguage: setResolvedLanguage,
    availableLanguages,
  }
}
