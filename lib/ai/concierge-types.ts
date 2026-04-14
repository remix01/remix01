export type ConciergeLanguage = 'sl' | 'en' | 'hr' | 'de' | 'it'

export const SUPPORTED_CONCIERGE_LANGUAGES: ConciergeLanguage[] = ['sl', 'en', 'hr', 'de', 'it']

export const CONCIERGE_LANGUAGE_LABELS: Record<ConciergeLanguage, string> = {
  sl: 'Slovenščina',
  en: 'English',
  hr: 'Hrvatski',
  de: 'Deutsch',
  it: 'Italiano',
}

export const CONCIERGE_SPEECH_LOCALES: Record<ConciergeLanguage, string> = {
  sl: 'sl-SI',
  en: 'en-US',
  hr: 'hr-HR',
  de: 'de-DE',
  it: 'it-IT',
}

