import { createPublicClient } from '@/lib/supabase/server'
import type { ObrtnikProfile } from '@/types/marketplace'

export type ProviderLookupResult =
  | { ok: true; providers: ObrtnikProfile[]; hasProviders: boolean }
  | { ok: false; error: string }

/**
 * Direct public lookup that can distinguish query failures from empty markets.
 * Avoids DAL helper that normalizes query errors to [].
 */
export async function safeProviderLookup(input: {
  categoryId: string
  cityName: string
  limit?: number
}): Promise<ProviderLookupResult> {
  const supabase = createPublicClient()

  const { data: categoryRows, error: categoryError } = await supabase
    .from('obrtnik_categories')
    .select('obrtnik_id')
    .eq('category_id', input.categoryId)

  if (categoryError) {
    return { ok: false, error: `category_mapping_query_failed:${categoryError.message}` }
  }

  const categoryObrtnikIds = (categoryRows ?? [])
    .map((row) => row.obrtnik_id)
    .filter((id): id is string => Boolean(id))

  if (categoryObrtnikIds.length === 0) {
    return { ok: true, providers: [], hasProviders: false }
  }

  const { data: providers, error: providersError } = await supabase
    .from('obrtnik_profiles')
    .select('*, profile:profiles(*)')
    .in('id', categoryObrtnikIds)
    .eq('is_verified', true)
    .eq('is_available', true)
    .eq('profile.location_city', input.cityName)
    .order('avg_rating', { ascending: false })
    .limit(input.limit ?? 12)

  if (providersError) {
    return { ok: false, error: `provider_query_failed:${providersError.message}` }
  }

  const normalized = (providers ?? []) as unknown as ObrtnikProfile[]
  return { ok: true, providers: normalized, hasProviders: normalized.length > 0 }
}
