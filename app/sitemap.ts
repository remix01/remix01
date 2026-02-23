import { MetadataRoute } from 'next'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'

const BASE_URL = 'https://www.liftgo.net'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  
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

  // Fetch all active categories
  let categoryPages: MetadataRoute.Sitemap = []
  let cityCategoryPages: MetadataRoute.Sitemap = []

  try {
    const categories = await getActiveCategoriesPublic()

    // Category pages
    categoryPages = categories.map(cat => ({
      url: `${BASE_URL}/${cat.slug}`,
      priority: 0.9,
      changeFrequency: 'daily' as const,
      lastModified: new Date(),
    }))

    // Category + City pages (225 pages)
    cityCategoryPages = categories.flatMap(cat =>
      SLOVENIAN_CITIES.map(city => ({
        url: `${BASE_URL}/${cat.slug}/${city.slug}`,
        priority: 0.8,
        changeFrequency: 'daily' as const,
        lastModified: new Date(),
      }))
    )
  } catch (error) {
    console.error('[v0] Error fetching categories for sitemap:', error)
  }

  return [
    ...staticPages.map(p => ({
      ...p,
      lastModified: new Date(),
    })),
    ...categoryPages,
    ...cityCategoryPages,
  ]
}
