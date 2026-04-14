import type { ConciergeLanguage } from '@/hooks/useLanguage'

const DICTIONARY: Record<ConciergeLanguage, string[]> = {
  sl: ['koliko', 'zanima', 'kopalnica', 'pipa', 'streha', 'mojster', 'rabim', 'prosim'],
  en: ['how much', 'need', 'bathroom', 'quote', 'plumber', 'electrician', 'roof'],
  hr: ['koliko', 'trebam', 'kupaonica', 'vodoinstalater', 'ponuda', 'majstor'],
  de: ['wie viel', 'brauche', 'badezimmer', 'angebot', 'klempner', 'dach'],
  it: ['quanto', 'bagno', 'preventivo', 'idraulico', 'elettricista', 'tetto'],
}

export function detectLanguage(input: string, fallback: ConciergeLanguage = 'sl'): ConciergeLanguage {
  const normalized = input.toLowerCase()
  const scored = (Object.keys(DICTIONARY) as ConciergeLanguage[]).map((lang) => {
    const score = DICTIONARY[lang].reduce((acc, kw) => (normalized.includes(kw) ? acc + 1 : acc), 0)
    return { lang, score }
  })

  const best = scored.sort((a, b) => b.score - a.score)[0]
  if (!best || best.score === 0) return fallback
  return best.lang
}
