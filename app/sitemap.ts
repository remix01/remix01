import type { MetadataRoute } from 'next'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'
import { SLOVENIAN_CITIES } from '@/lib/seo/locations'
import { getAllPosts } from '@/lib/blog'
import { buildSeoContent, isSeoIndexablePage } from '@/lib/seo/programmatic-content'

const BASE_URL = 'https://liftgo.net'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes = [
    '/', '/kako-deluje', '/za-obrtnike', '/cenik', '/orodja', '/e-kljuc', '/faq', '/about', '/contact', '/terms', '/privacy',
    '/search', '/blog', '/mojstri', '/dela',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))

  const [categories, posts] = await Promise.all([
    getActiveCategoriesPublic().catch(() => []),
    getAllPosts().catch(() => []),
  ])

  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap((category) => {
    const categorySeo = buildSeoContent({ categoryName: category.name, categorySlug: category.slug })
    const base = {
      lastModified: now,
      changeFrequency: 'daily' as const,
    }

    const entries: MetadataRoute.Sitemap = []

    if (isSeoIndexablePage({
      categorySlug: category.slug,
      canonicalCategorySlug: category.slug,
      contentBlocks: [categorySeo.categoryIntro, categorySeo.whatToExpect, ...categorySeo.faqItems.map((item) => item.question)],
    })) {
      entries.push({ url: `${BASE_URL}/${category.slug}`, priority: 0.9, ...base })
    }

    for (const city of SLOVENIAN_CITIES) {
      const citySeo = buildSeoContent({ categoryName: category.name, categorySlug: category.slug, citySlug: city.slug, cityName: city.name })
      if (isSeoIndexablePage({
        categorySlug: category.slug,
        citySlug: city.slug,
        canonicalCategorySlug: category.slug,
        contentBlocks: [citySeo.categoryIntro, citySeo.whatToExpect, ...(citySeo.cityIntro ? [citySeo.cityIntro] : []), ...citySeo.faqItems.map((item) => item.answer)],
      })) {
        entries.push({ url: `${BASE_URL}/${category.slug}/${city.slug}`, priority: 0.8, ...base })
      }
    }

    return entries
  })

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticEntries, ...categoryEntries, ...postEntries]
}
