// International SEO — data + content builders for Austria (de) and Croatia (hr)

export type SupportedLocale = 'de' | 'hr'

export type LocaleCity = {
  readonly name: string
  readonly slug: string
  readonly region: string
}

// ── Austrian cities ──────────────────────────────────────────────────────────
export const AUSTRIAN_CITIES: readonly LocaleCity[] = [
  { name: 'Wien', slug: 'wien', region: 'Wien' },
  { name: 'Graz', slug: 'graz', region: 'Steiermark' },
  { name: 'Linz', slug: 'linz', region: 'Oberösterreich' },
  { name: 'Salzburg', slug: 'salzburg', region: 'Salzburg' },
  { name: 'Innsbruck', slug: 'innsbruck', region: 'Tirol' },
  { name: 'Klagenfurt', slug: 'klagenfurt', region: 'Kärnten' },
  { name: 'Villach', slug: 'villach', region: 'Kärnten' },
  { name: 'Wels', slug: 'wels', region: 'Oberösterreich' },
  { name: 'St. Pölten', slug: 'st-poelten', region: 'Niederösterreich' },
  { name: 'Dornbirn', slug: 'dornbirn', region: 'Vorarlberg' },
  { name: 'Wiener Neustadt', slug: 'wiener-neustadt', region: 'Niederösterreich' },
  { name: 'Steyr', slug: 'steyr', region: 'Oberösterreich' },
  { name: 'Feldkirch', slug: 'feldkirch', region: 'Vorarlberg' },
  { name: 'Bregenz', slug: 'bregenz', region: 'Vorarlberg' },
  { name: 'Eisenstadt', slug: 'eisenstadt', region: 'Burgenland' },
] as const

// ── Croatian cities ──────────────────────────────────────────────────────────
export const CROATIAN_CITIES: readonly LocaleCity[] = [
  { name: 'Zagreb', slug: 'zagreb', region: 'Grad Zagreb' },
  { name: 'Split', slug: 'split', region: 'Splitsko-dalmatinska' },
  { name: 'Rijeka', slug: 'rijeka', region: 'Primorsko-goranska' },
  { name: 'Osijek', slug: 'osijek', region: 'Osječko-baranjska' },
  { name: 'Zadar', slug: 'zadar', region: 'Zadarska' },
  { name: 'Slavonski Brod', slug: 'slavonski-brod', region: 'Brodsko-posavska' },
  { name: 'Pula', slug: 'pula', region: 'Istarska' },
  { name: 'Karlovac', slug: 'karlovac', region: 'Karlovačka' },
  { name: 'Varaždin', slug: 'varazdin', region: 'Varaždinska' },
  { name: 'Šibenik', slug: 'sibenik', region: 'Šibensko-kninska' },
  { name: 'Sisak', slug: 'sisak', region: 'Sisačko-moslavačka' },
  { name: 'Dubrovnik', slug: 'dubrovnik', region: 'Dubrovačko-neretvanska' },
  { name: 'Bjelovar', slug: 'bjelovar', region: 'Bjelovarsko-bilogorska' },
  { name: 'Koprivnica', slug: 'koprivnica', region: 'Koprivničko-križevačka' },
  { name: 'Čakovec', slug: 'cakovec', region: 'Međimurska' },
] as const

// ── Category translations (SL slug → locale-specific data) ──────────────────
type CategoryTranslation = {
  slug: string
  name: string
}

export const CATEGORY_TRANSLATIONS: Record<string, Record<SupportedLocale, CategoryTranslation>> = {
  'vodovodna-dela': {
    de: { slug: 'installation', name: 'Installateur' },
    hr: { slug: 'vodoinstalacijski-radovi', name: 'Vodoinstalacijski radovi' },
  },
  'elektrika': {
    de: { slug: 'elektroinstallation', name: 'Elektroinstallation' },
    hr: { slug: 'elektroinstalacije', name: 'Elektroinstalacije' },
  },
  'slikopleskarstvo': {
    de: { slug: 'malerarbeiten', name: 'Malerarbeiten' },
    hr: { slug: 'soboslikarski-radovi', name: 'Soboslikarski radovi' },
  },
  'tesarstvo': {
    de: { slug: 'tischlerarbeiten', name: 'Tischlerarbeiten' },
    hr: { slug: 'stolarski-radovi', name: 'Stolarski radovi' },
  },
  'kljucavnicarstvo': {
    de: { slug: 'schlosserarbeiten', name: 'Schlosserarbeiten' },
    hr: { slug: 'bravarski-radovi', name: 'Bravarski radovi' },
  },
  'tlakovanje': {
    de: { slug: 'pflasterarbeiten', name: 'Pflasterarbeiten' },
    hr: { slug: 'poplocavanje', name: 'Popločavanje' },
  },
  'fasaderstvo': {
    de: { slug: 'fassadenarbeiten', name: 'Fassadenarbeiten' },
    hr: { slug: 'fasaderski-radovi', name: 'Fasaderski radovi' },
  },
  'ogrevanje-klima': {
    de: { slug: 'heizung-klima', name: 'Heizung & Klimaanlage' },
    hr: { slug: 'grijanje-klimatizacija', name: 'Grijanje i klimatizacija' },
  },
  'selitev': {
    de: { slug: 'umzugsservice', name: 'Umzugsservice' },
    hr: { slug: 'usluge-selidbe', name: 'Usluge selidbe' },
  },
  'ciscenje': {
    de: { slug: 'reinigung', name: 'Reinigungsservice' },
    hr: { slug: 'ciscenje', name: 'Usluge čišćenja' },
  },
  'vrtnarstvo': {
    de: { slug: 'gartenarbeiten', name: 'Gartenarbeiten' },
    hr: { slug: 'vrtlarstvo', name: 'Vrtlarski radovi' },
  },
  'sanacija-vlage': {
    de: { slug: 'feuchtigkeitssanierung', name: 'Feuchtigkeitssanierung' },
    hr: { slug: 'sanacija-vlage', name: 'Sanacija vlage' },
  },
  'stresna-dela': {
    de: { slug: 'dacharbeiten', name: 'Dachdecker' },
    hr: { slug: 'krovacki-radovi', name: 'Krovački radovi' },
  },
  'keramika': {
    de: { slug: 'fliesenlegerarbeiten', name: 'Fliesenleger' },
    hr: { slug: 'keramicarski-radovi', name: 'Keramičarski radovi' },
  },
  'pohistvo': {
    de: { slug: 'moebelservice', name: 'Möbelservice' },
    hr: { slug: 'servis-namjestaja', name: 'Servis namještaja' },
  },
}

// ── Reverse lookup: locale slug → SL slug ────────────────────────────────────
export function getSlSlugFromLocale(localeSlug: string, locale: SupportedLocale): string | null {
  for (const [slSlug, translations] of Object.entries(CATEGORY_TRANSLATIONS)) {
    if (translations[locale]?.slug === localeSlug) return slSlug
  }
  return null
}

export function getCitiesForLocale(locale: SupportedLocale): readonly LocaleCity[] {
  return locale === 'de' ? AUSTRIAN_CITIES : CROATIAN_CITIES
}

export function getCityBySlugForLocale(slug: string, locale: SupportedLocale): LocaleCity | undefined {
  return getCitiesForLocale(locale).find(c => c.slug === slug)
}

// ── Locale metadata ──────────────────────────────────────────────────────────
export const LOCALE_COUNTRY: Record<SupportedLocale, string> = { de: 'AT', hr: 'HR' }
export const LOCALE_OG: Record<SupportedLocale, string> = { de: 'de_AT', hr: 'hr_HR' }

// ── Content builders ─────────────────────────────────────────────────────────
type FaqItem = { question: string; answer: string }

type SeoContent = {
  categoryTitle: string
  categoryIntro: string
  whatToExpect: string
  faqItems: FaqItem[]
  breadcrumbLabels: string[]
  schemaDescription: string
  relatedCitiesLabel: string
  country: string
  ogLocale: string
}

export function buildSeoContentDe(params: {
  categoryName: string
  categorySlug: string
  cityName?: string
}): SeoContent {
  const loc = params.cityName ? `in ${params.cityName}` : 'in Österreich'

  return {
    categoryTitle: params.cityName
      ? `${params.categoryName} in ${params.cityName}`
      : `${params.categoryName} in Österreich`,
    categoryIntro: params.cityName
      ? `LiftGO hilft Ihnen, geprüfte ${params.categoryName}-Handwerker in ${params.cityName} schnell zu finden. Profile, Bewertungen und Angebote auf einen Blick.`
      : `Auf LiftGO finden Sie geprüfte ${params.categoryName}-Handwerker aus ganz Österreich. Vergleichen Sie Profile und fordern Sie kostenlos Angebote an.`,
    whatToExpect: params.cityName
      ? `Für präzise Angebote geben Sie den Arbeitsumfang, den Objektzugang und einen Wunschtermin in ${params.cityName} an.`
      : 'Für präzise Angebote bereiten Sie eine kurze Beschreibung der Arbeiten, ein ungefähres Budget und den Standort vor.',
    faqItems: [
      {
        question: `Wie schnell erhalte ich Angebote für ${params.categoryName} ${loc}?`,
        answer: params.cityName
          ? `Die Reaktionszeit hängt von der Verfügbarkeit der Handwerker in ${params.cityName} ab. In der Regel erhalten Sie erste Angebote kurz nach der Auftragserteilung.`
          : 'Sie erhalten in der Regel erste Angebote kurz nach der Auftragserteilung, abhängig von der Verfügbarkeit der Handwerker.',
      },
      {
        question: `Welche Angaben brauche ich für eine ${params.categoryName}-Anfrage?`,
        answer: 'Geben Sie den Umfang der Arbeiten, Fotos, die genaue Adresse und den gewünschten Ausführungstermin an.',
      },
      {
        question: `Wie vergleiche ich Handwerker für ${params.categoryName}?`,
        answer: 'Vergleichen Sie Referenzen, Reaktionszeiten, Angebotsinhalte und Konditionen. Klären Sie Umfang und Termin vor der Beauftragung.',
      },
      {
        question: `Ist die ${params.categoryName}-Anfrage kostenlos?`,
        answer: 'Ja. Die Anfrage ist kostenlos und unverbindlich, bis Sie sich für einen Handwerker entscheiden.',
      },
    ],
    breadcrumbLabels: params.cityName
      ? ['Start', params.categoryName, params.cityName]
      : ['Start', params.categoryName],
    schemaDescription: `${params.categoryName} ${loc} auf LiftGO: Handwerkerprofile vergleichen, Anfrage stellen und Auftrag vergeben.`,
    relatedCitiesLabel: `${params.categoryName} in österreichischen Städten`,
    country: 'AT',
    ogLocale: 'de_AT',
  }
}

export function buildSeoContentHr(params: {
  categoryName: string
  categorySlug: string
  cityName?: string
}): SeoContent {
  const loc = params.cityName ? `u ${params.cityName}` : 'u Hrvatskoj'

  return {
    categoryTitle: params.cityName
      ? `${params.categoryName} u ${params.cityName}`
      : `${params.categoryName} u Hrvatskoj`,
    categoryIntro: params.cityName
      ? `LiftGO vam pomaže brzo pronaći provjerene majstore za ${params.categoryName.toLowerCase()} u ${params.cityName}. Profili, ocjene i ponude na jednom mjestu.`
      : `Na LiftGO pronalazite provjerene majstore za ${params.categoryName.toLowerCase()} iz cijele Hrvatske. Usporedite profile i zatražite ponude besplatno.`,
    whatToExpect: params.cityName
      ? `Za preciznije ponude navedite opseg radova, pristup objektu i željeni termin u ${params.cityName}.`
      : 'Za preciznije ponude pripremite kratak opis radova, okvirni proračun i lokaciju.',
    faqItems: [
      {
        question: `Kako brzo dobivam ponude za ${params.categoryName} ${loc}?`,
        answer: params.cityName
          ? `Brzina odgovora ovisi o dostupnosti majstora u ${params.cityName}. Prve ponude obično primate ubrzo nakon slanja upita.`
          : 'Prve ponude obično primate ubrzo nakon slanja upita, ovisno o dostupnosti majstora.',
      },
      {
        question: `Koje podatke trebam za upit za ${params.categoryName}?`,
        answer: 'Navedite opseg radova, fotografije, adresu i željeni termin izvođenja.',
      },
      {
        question: `Kako usporediti majstore za ${params.categoryName}?`,
        answer: 'Usporedite reference, brzinu odgovora, sadržaj ponude i uvjete. Dogovorite opseg i termin prije potvrde.',
      },
      {
        question: `Je li slanje upita za ${params.categoryName} besplatno?`,
        answer: 'Da. Slanje upita je besplatno i bez obveze dok se ne odlučite za suradnju s odabranim majstorom.',
      },
    ],
    breadcrumbLabels: params.cityName
      ? ['Početna', params.categoryName, params.cityName]
      : ['Početna', params.categoryName],
    schemaDescription: `${params.categoryName} ${loc} na LiftGO: usporedba profila majstora, slanje upita i dogovor o izvođenju.`,
    relatedCitiesLabel: `${params.categoryName} u hrvatskim gradovima`,
    country: 'HR',
    ogLocale: 'hr_HR',
  }
}

// ── Meta generators ──────────────────────────────────────────────────────────
export function generateLocaleMeta(params: {
  categoryName: string
  cityName?: string
  locale: SupportedLocale
}) {
  if (params.locale === 'de') {
    const loc = params.cityName ? `in ${params.cityName}` : 'in Österreich'
    return {
      title: `${params.categoryName} ${loc} | LiftGO — Geprüfte Handwerker`,
      description: `Suchen Sie einen zuverlässigen ${params.categoryName} ${loc}? Auf LiftGO finden Sie geprüfte Handwerker mit Kundenbewertungen. Kostenlose Anfrage, Antwort in 2 Stunden.`,
    }
  }

  const loc = params.cityName ? `u ${params.cityName}` : 'u Hrvatskoj'
  return {
    title: `${params.categoryName} ${loc} | LiftGO — Provjereni majstori`,
    description: `Tražite pouzdanog ${params.categoryName.toLowerCase()} ${loc}? Na LiftGO pronalazite provjerene majstore s ocjenama. Besplatan upit, odgovor za 2 sata.`,
  }
}
