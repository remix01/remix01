const SLOVENIAN_CITIES = [
  { name: 'Ljubljana', slug: 'ljubljana', region: 'Osrednjeslovenska' },
  { name: 'Maribor', slug: 'maribor', region: 'Podravska' },
  { name: 'Celje', slug: 'celje', region: 'Savinjska' },
  { name: 'Kranj', slug: 'kranj', region: 'Gorenjska' },
  { name: 'Koper', slug: 'koper', region: 'Obalno-kraška' },
  { name: 'Velenje', slug: 'velenje', region: 'Savinjska' },
  { name: 'Novo mesto', slug: 'novo-mesto', region: 'Jugovzhodna Slovenija' },
  { name: 'Ptuj', slug: 'ptuj', region: 'Podravska' },
  { name: 'Trbovlje', slug: 'trbovlje', region: 'Zasavska' },
  { name: 'Kamnik', slug: 'kamnik', region: 'Osrednjeslovenska' },
  { name: 'Jesenice', slug: 'jesenice', region: 'Gorenjska' },
  { name: 'Nova Gorica', slug: 'nova-gorica', region: 'Goriška' },
  { name: 'Domžale', slug: 'domzale', region: 'Osrednjeslovenska' },
  { name: 'Škofja Loka', slug: 'skofja-loka', region: 'Gorenjska' },
  { name: 'Murska Sobota', slug: 'murska-sobota', region: 'Pomurska' },
]

const RESERVED_DIRECTORY_SLUGS = new Set([
  'images', 'icons', 'fonts', 'api', 'admin', '_next', 'static', 'favicon.ico', 'robots.txt',
  'sitemap.xml', 'sw.js', 'manifest.json', 'actuator', 'env', '__depproxyproof', 'wp-admin',
  'wp-login', 'phpinfo', 'server-status', 'dashboard', 'partner-dashboard', 'auth',
])

function buildSeoContent({ categoryName, cityName }) {
  const locationLabel = cityName ? `v ${cityName}` : 'po Sloveniji'
  const categoryTitle = cityName ? `${categoryName} v ${cityName}` : `${categoryName} v Sloveniji`
  const categoryIntro = cityName
    ? `LiftGO pomaga hitro najti preverjene izvajalce za ${categoryName.toLowerCase()} ${locationLabel}. Primerjate profile, odzivnost in ponudbe na enem mestu.`
    : `Na LiftGO za ${categoryName.toLowerCase()} najdete preverjene profile izvajalcev iz različnih regij Slovenije. Pred oddajo povpraševanja lahko primerjate odzivnost in reference.`
  const whatToExpect = cityName
    ? `Za bolj natančne ponudbe navedite obseg del, dostopnost objekta in okviren termin v mestu ${cityName}. Tako izvajalci pripravijo bolj uporabne odgovore.`
    : `Za bolj natančne ponudbe pripravite kratek opis del, okviren proračun in lokacijo. Izvajalci vam tako lažje pripravijo relevantne ponudbe.`

  const faqItems = [
    { question: `Kako hitro dobim ponudbe za ${categoryName.toLowerCase()} ${locationLabel}?`, answer: 'Čas odziva je odvisen od razpoložljivosti izvajalcev in obsega dela.' },
    { question: `Katere podatke vključim v povpraševanje za ${categoryName.toLowerCase()}?`, answer: 'Vključite obseg del, lokacijo, fotografije in želeni termin izvedbe.' },
    { question: `Kako primerjam izvajalce za ${categoryName.toLowerCase()}?`, answer: 'Primerjajte reference, odzivni čas, ponudbo in pogoje izvedbe.' },
    { question: `Ali je oddaja povpraševanja za ${categoryName.toLowerCase()} brezplačna?`, answer: 'Da, oddaja povpraševanja je brezplačna in brez obveznosti.' },
  ]

  return { categoryTitle, categoryIntro, whatToExpect, cityIntro: cityName ? `Ponudbe za ${categoryName.toLowerCase()} v mestu ${cityName} lahko primerjate glede na odzivnost in vsebino storitve.` : null, faqItems }
}

function isSeoIndexablePage({ categorySlug, citySlug, canonicalCategorySlug, contentBlocks = [] }) {
  if (!categorySlug) return false
  if (RESERVED_DIRECTORY_SLUGS.has(categorySlug) || categorySlug.includes('.')) return false
  if (citySlug && (RESERVED_DIRECTORY_SLUGS.has(citySlug) || citySlug.includes('.'))) return false
  if (canonicalCategorySlug && canonicalCategorySlug !== categorySlug) return false
  return new Set(contentBlocks.map((x) => String(x).trim()).filter(Boolean)).size >= 3
}

async function fetchCategories() {
  const base = (process.env.SEO_AUDIT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net').replace(/\/$/, '')
  const response = await fetch(`${base}/api/catalog/categories`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const json = await response.json()
  return Array.isArray(json?.data) ? json.data : []
}

async function run() {
  let categories = []
  try {
    categories = await fetchCategories()
  } catch (error) {
    console.warn('[seo-validator] Failed to fetch categories; set SEO_AUDIT_BASE_URL if needed.', error instanceof Error ? error.message : String(error))
  }

  let indexableCategories = 0
  let indexableCities = 0
  let missingFaq = 0
  let weakPages = 0
  const titles = new Map()

  for (const category of categories) {
    const c = buildSeoContent({ categoryName: category.name, categorySlug: category.slug })
    if (isSeoIndexablePage({ categorySlug: category.slug, canonicalCategorySlug: category.slug, contentBlocks: [c.categoryIntro, c.whatToExpect, ...c.faqItems.map((f) => f.question)] })) indexableCategories++
    if (c.faqItems.length < 3) missingFaq++
    titles.set(c.categoryTitle, (titles.get(c.categoryTitle) || 0) + 1)

    for (const city of SLOVENIAN_CITIES) {
      const s = buildSeoContent({ categoryName: category.name, categorySlug: category.slug, cityName: city.name, citySlug: city.slug })
      const ok = isSeoIndexablePage({ categorySlug: category.slug, citySlug: city.slug, canonicalCategorySlug: category.slug, contentBlocks: [s.categoryIntro, s.whatToExpect, s.cityIntro || '', ...s.faqItems.map((f) => f.answer)] })
      if (ok) indexableCities++
      else weakPages++
      if (s.faqItems.length < 3) missingFaq++
      titles.set(s.categoryTitle, (titles.get(s.categoryTitle) || 0) + 1)
    }
  }

  const duplicateTitles = [...titles.entries()].filter(([, n]) => n > 1).length
  console.log(JSON.stringify({ categories: categories.length, indexableCategories, indexableCities, missingFaq, weakPages, duplicateTitles, sitemapCandidates: indexableCategories + indexableCities }, null, 2))
}

run()
