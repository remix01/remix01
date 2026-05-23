import { SLOVENIAN_CITIES, getCityBySlug } from '@/lib/seo/locations'

type FaqItem = { question: string; answer: string }

export const RESERVED_DIRECTORY_SLUGS = new Set([
  'images', 'icons', 'fonts', 'api', 'admin',
  '_next', 'static', 'favicon.ico', 'robots.txt',
  'sitemap.xml', 'sw.js', 'manifest.json',
  'actuator', 'env', '__depproxyproof',
  'wp-admin', 'wp-login', 'phpinfo', 'server-status',
  'dashboard', 'partner-dashboard', 'auth',
])

export function buildSeoContent(params: {
  categoryName: string
  categorySlug: string
  citySlug?: string
  cityName?: string
}) {
  const city = params.citySlug ? getCityBySlug(params.citySlug) : undefined
  const cityName = params.cityName || city?.name
  const locationLabel = cityName ? `v ${cityName}` : 'po Sloveniji'

  const categoryTitle = cityName
    ? `${params.categoryName} v ${cityName}`
    : `${params.categoryName} v Sloveniji`

  const categoryIntro = cityName
    ? `LiftGO pomaga hitro najti preverjene izvajalce za ${params.categoryName.toLowerCase()} ${locationLabel}. Primerjate profile, odzivnost in ponudbe na enem mestu.`
    : `Na LiftGO za ${params.categoryName.toLowerCase()} najdete preverjene profile izvajalcev iz različnih regij Slovenije. Pred oddajo povpraševanja lahko primerjate odzivnost in reference.`

  const whatToExpect = cityName
    ? `Za bolj natančne ponudbe navedite obseg del, dostopnost objekta in okviren termin v mestu ${cityName}. Tako izvajalci pripravijo bolj uporabne odgovore.`
    : `Za bolj natančne ponudbe pripravite kratek opis del, okviren proračun in lokacijo. Izvajalci vam tako lažje pripravijo relevantne ponudbe.`

  const faqItems: FaqItem[] = [
    {
      question: `Kako hitro dobim ponudbe za ${params.categoryName.toLowerCase()} ${locationLabel}?`,
      answer: cityName
        ? `Čas odziva je odvisen od razpoložljivosti izvajalcev v mestu ${cityName}, običajno pa prve odgovore prejmete kmalu po oddaji povpraševanja.`
        : 'Čas odziva je odvisen od razpoložljivosti izvajalcev po regijah, prve odgovore pa praviloma prejmete kmalu po oddaji povpraševanja.',
    },
    {
      question: `Katere podatke vključim v povpraševanje za ${params.categoryName.toLowerCase()}?`,
      answer: cityName
        ? `Vključite obseg del, fotografije, naslov lokacije v mestu ${cityName} in želeni termin izvedbe.`
        : 'Vključite obseg del, fotografije, lokacijo in želeni termin izvedbe, da izvajalci pripravijo primerljive ponudbe.',
    },
    {
      question: `Kako primerjam izvajalce za ${params.categoryName.toLowerCase()}?`,
      answer: 'Primerjajte reference, odzivni čas, vsebino ponudbe in pogoje izvedbe. Pred potrditvijo se dogovorite tudi o obsegu in terminu.',
    },
    {
      question: `Ali je oddaja povpraševanja za ${params.categoryName.toLowerCase()} brezplačna?`,
      answer: 'Da. Oddaja povpraševanja je brezplačna in brez obveznosti, dokler se ne odločite za sodelovanje z izbranim izvajalcem.',
    },
  ]

  return {
    categoryTitle,
    categoryIntro,
    whatToExpect,
    cityIntro: cityName ? `Ponudbe za ${params.categoryName.toLowerCase()} v mestu ${cityName} lahko primerjate glede na odzivnost in vsebino storitve.` : null,
    faqItems,
    relatedServicesLabel: 'Podobne storitve',
    relatedCitiesLabel: `${params.categoryName} po mestih v Sloveniji`,
    breadcrumbLabels: cityName
      ? ['Domov', params.categoryName, cityName]
      : ['Domov', params.categoryName],
    schemaDescription: `${params.categoryName} ${locationLabel} na LiftGO: primerjava profilov izvajalcev, oddaja povpraševanja in dogovor o izvedbi.`,
  }
}


export function getRelatedCategoryLinks(categories: Array<{ slug: string; name: string }>, currentCategorySlug: string, citySlug?: string, limit = 6) {
  return categories
    .filter((category) => category.slug !== currentCategorySlug)
    .slice(0, limit)
    .map((category) => ({
      label: category.name,
      href: citySlug ? `/${category.slug}/${citySlug}` : `/${category.slug}`
    }))
}

export function getRelatedCityLinks(categorySlug: string, citySlug?: string, limit = 8) {
  return SLOVENIAN_CITIES
    .filter((city) => city.slug !== citySlug)
    .slice(0, limit)
    .map((city) => ({ label: city.name, href: `/${categorySlug}/${city.slug}` }))
}

export function getInquiryLink(categorySlug: string, citySlug?: string) {
  if (citySlug) return `/novo-povprasevanje?category=${encodeURIComponent(categorySlug)}&city=${encodeURIComponent(citySlug)}`
  return `/novo-povprasevanje?category=${encodeURIComponent(categorySlug)}`
}

export function getCatalogLink() {
  return '/mojstri'
}

export function isSeoIndexablePage(params: {
  categorySlug?: string
  citySlug?: string
  canonicalCategorySlug?: string
  contentBlocks?: string[]
  isDeprecatedRouteFamily?: boolean
}) {
  if (!params.categorySlug) return false
  if (RESERVED_DIRECTORY_SLUGS.has(params.categorySlug) || params.categorySlug.includes('.')) return false
  if (params.citySlug && (RESERVED_DIRECTORY_SLUGS.has(params.citySlug) || params.citySlug.includes('.'))) return false
  if (params.canonicalCategorySlug && params.canonicalCategorySlug !== params.categorySlug) return false
  if (params.isDeprecatedRouteFamily) return false

  const uniqueBlockCount = new Set((params.contentBlocks || []).map((x) => x.trim()).filter(Boolean)).size
  return uniqueBlockCount >= 3
}
