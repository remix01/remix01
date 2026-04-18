import type { Category } from '@/types/marketplace'
import { getActiveCategoriesPublic, getCategoryBySlug } from '@/lib/dal/categories'
import { getCityBySlug } from '@/lib/seo/locations'

const CITY_ALIASES: Record<string, string> = {
  lj: 'ljubljana',
  mb: 'maribor',
  nm: 'novo-mesto',
}

const CATEGORY_ALIASES: Record<string, string> = {
  vodoinstalater: 'vodovodar',
  vodoinstalaterji: 'vodovodar',
  elektrikar: 'elektricar',
  klimatizer: 'klima-servis',
  klime: 'klima-servis',
}

function normalizeSegment(input: string): string {
  return decodeURIComponent(input || '')
    .trim()
    .toLowerCase()
    .replace(/,+$/g, '')
    .replace(/\s+/g, '-')
}

export function normalizeDirectoryParams(rawCategory: string, rawCity?: string) {
  const normalizedCategory = normalizeSegment(rawCategory)
  const aliasedCategory = CATEGORY_ALIASES[normalizedCategory] || normalizedCategory

  if (!rawCity) {
    return { category: aliasedCategory }
  }

  const normalizedCity = normalizeSegment(rawCity)
  const aliasedCity = CITY_ALIASES[normalizedCity] || normalizedCity

  return {
    category: aliasedCategory,
    city: aliasedCity,
  }
}

export async function resolveCategorySlugOrFallback(slug: string): Promise<Category | null> {
  const direct = await getCategoryBySlug(slug)
  if (direct) return direct

  const all = await getActiveCategoriesPublic()
  const match = all.find((cat) => normalizeSegment(cat.slug) === normalizeSegment(slug))
  return match || null
}

export function resolveCitySlugOrFallback(slug: string) {
  return getCityBySlug(slug) || getCityBySlug(normalizeSegment(slug))
}
