import { RESERVED_DIRECTORY_SLUGS } from '@/lib/seo/programmatic-content'
import { resolveCategorySlugOrFallback, resolveCitySlugOrFallback } from '@/lib/seo/directory-routing'

const SERVICE_ALIASES: Record<string, string> = {
  ogrevanje: 'heating',
  heating: 'heating',
  heizung: 'heating',
  elektrika: 'electrical',
  electrician: 'electrical',
  elektriker: 'electrical',
  vodovod: 'plumbing',
  plumber: 'plumbing',
  plumbing: 'plumbing',
  klempner: 'plumbing',
  klimatizacija: 'hvac',
  'air-conditioning': 'hvac',
  hvac: 'hvac',
  klima: 'hvac',
  varovanje: 'security',
  security: 'security',
}

const HUMAN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type MarketplaceIntentKind =
  | 'scanner_or_reserved'
  | 'valid_existing_market'
  | 'valid_empty_market'
  | 'provider_lookup_error'
  | 'category_not_listed_yet'
  | 'location_not_listed_yet'
  | 'human_service_location_intent'
  | 'global_market_coming_soon'
  | 'unknown_invalid'

export async function resolveMarketplaceIntent(input: {
  categorySlug: string
  citySlug: string
  hasProviders?: boolean
  providerLookupOk?: boolean
}) {
  const categorySlug = input.categorySlug
  const citySlug = input.citySlug

  if (
    RESERVED_DIRECTORY_SLUGS.has(categorySlug) ||
    RESERVED_DIRECTORY_SLUGS.has(citySlug) ||
    categorySlug.includes('.') ||
    citySlug.includes('.')
  ) {
    return { kind: 'scanner_or_reserved' as MarketplaceIntentKind }
  }

  const normalizedService = SERVICE_ALIASES[categorySlug] ?? null
  const category = await resolveCategorySlugOrFallback(categorySlug)
  const city = resolveCitySlugOrFallback(citySlug)

  if (category && city) {
    if (input.providerLookupOk === false) return { kind: 'provider_lookup_error' as MarketplaceIntentKind, category, city }
    if (input.hasProviders) return { kind: 'valid_existing_market' as MarketplaceIntentKind, category, city }
    return { kind: 'valid_empty_market' as MarketplaceIntentKind, category, city }
  }

  const humanLike = HUMAN_SLUG.test(categorySlug) && HUMAN_SLUG.test(citySlug)
  if (!humanLike) return { kind: 'unknown_invalid' as MarketplaceIntentKind }

  if (!category && city && normalizedService) {
    return { kind: 'category_not_listed_yet' as MarketplaceIntentKind, city, normalizedService }
  }

  if (category && !city) {
    return { kind: 'location_not_listed_yet' as MarketplaceIntentKind, category }
  }

  if (!category && !city && normalizedService) {
    return { kind: 'global_market_coming_soon' as MarketplaceIntentKind, normalizedService }
  }

  if (!category && !city) {
    return { kind: 'human_service_location_intent' as MarketplaceIntentKind, normalizedService }
  }

  return { kind: 'unknown_invalid' as MarketplaceIntentKind }
}
