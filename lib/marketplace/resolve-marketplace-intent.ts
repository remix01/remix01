import { normalizeDirectoryParams, resolveCategorySlugOrFallback, resolveCitySlugOrFallback } from '@/lib/seo/directory-routing'
import { RESERVED_DIRECTORY_SLUGS } from '@/lib/seo/programmatic-content'

export type MarketplaceIntentKind =
  | 'category_city'
  | 'scanner_or_reserved'
  | 'unknown_invalid'

export async function resolveMarketplaceIntent(rawCategory: string, rawCity: string) {
  const normalized = normalizeDirectoryParams(rawCategory, rawCity)
  const citySlug = normalized.city ?? ''

  if (
    RESERVED_DIRECTORY_SLUGS.has(normalized.category) ||
    normalized.category.includes('.') ||
    RESERVED_DIRECTORY_SLUGS.has(citySlug) ||
    citySlug.includes('.')
  ) {
    return { kind: 'scanner_or_reserved' as MarketplaceIntentKind, normalized }
  }

  const [category, city] = await Promise.all([
    resolveCategorySlugOrFallback(normalized.category),
    Promise.resolve(resolveCitySlugOrFallback(citySlug)),
  ])

  if (!category || !city) {
    return { kind: 'unknown_invalid' as MarketplaceIntentKind, normalized }
  }

  return { kind: 'category_city' as MarketplaceIntentKind, normalized, category, city }
}
