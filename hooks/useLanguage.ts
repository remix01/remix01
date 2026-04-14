'use client'

import { useMemo, useState } from 'react'
import {
  CONCIERGE_LANGUAGE_LABELS,
  SUPPORTED_CONCIERGE_LANGUAGES,
  type ConciergeLanguage,
} from '@/lib/ai/concierge-types'

function normalizeLanguage(input?: string | null): ConciergeLanguage {
  const base = String(input || '').toLowerCase().split('-')[0]
  if (SUPPORTED_CONCIERGE_LANGUAGES.includes(base as ConciergeLanguage)) {
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
      { code: 'sl' as const, label: CONCIERGE_LANGUAGE_LABELS.sl },
      { code: 'en' as const, label: CONCIERGE_LANGUAGE_LABELS.en },
      { code: 'hr' as const, label: CONCIERGE_LANGUAGE_LABELS.hr },
      { code: 'de' as const, label: CONCIERGE_LANGUAGE_LABELS.de },
      { code: 'it' as const, label: CONCIERGE_LANGUAGE_LABELS.it },
    ],
    []
  )

  return {
    language,
    setLanguage: setResolvedLanguage,
    availableLanguages,
  }
}
