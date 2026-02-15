import { MetadataRoute } from 'next'

const BASE_URL = 'https://www.liftgo.net'

export default function sitemap(): MetadataRoute.Sitemap {
  
  // Statične strani
  const staticPages = [
    { url: BASE_URL, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${BASE_URL}/kako-deluje`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/za-obrtnike`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/cenik`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/orodja`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/e-kljuc`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/faq`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE_URL}/about`, priority: 0.5, changeFrequency: 'yearly' as const },
    { url: `${BASE_URL}/contact`, priority: 0.5, changeFrequency: 'yearly' as const },
    { url: `${BASE_URL}/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${BASE_URL}/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
  ]

  // Kategorijske strani (za SEO)
  const kategorije = [
    'Gradnja-adaptacije',
    'Vodovod-ogrevanje', 
    'Elektrika-pametni-sistemi',
    'Mizarstvo-kovinarstvo',
    'Zakljucna-dela',
    'Okna-vrata-sencila',
    'Okolica-zunanja-ureditev',
    'Vzdrzevanje-popravila',
    'Poslovne-storitve',
  ]

  const kategorijskeStrani = kategorije.map(kat => ({
    url: `${BASE_URL}/storitev/${kat.toLowerCase()}`,
    priority: 0.8,
    changeFrequency: 'weekly' as const,
    lastModified: new Date(),
  }))

  // Lokacijske strani (za lokalni SEO)
  const mesta = [
    'ljubljana', 'maribor', 'celje', 'kranj', 
    'koper', 'novo-mesto', 'velenje', 'ptuj',
    'murska-sobota', 'nova-gorica',
  ]

  const lokacijskeStrani = mesta.map(mesto => ({
    url: `${BASE_URL}/obrtnik-${mesto}`,
    priority: 0.7,
    changeFrequency: 'weekly' as const,
    lastModified: new Date(),
  }))

  return [
    ...staticPages.map(p => ({
      ...p,
      lastModified: new Date(),
    })),
    ...kategorijskeStrani,
    ...lokacijskeStrani,
  ]
}
