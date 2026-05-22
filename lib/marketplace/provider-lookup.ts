import { listObrtnikiPublic } from '@/lib/dal/profiles'
import type { ObrtnikProfile } from '@/types/marketplace'

export type ProviderLookupResult =
  | { ok: true; providers: ObrtnikProfile[]; hasProviders: boolean }
  | { ok: false; error: string }

export async function safeProviderLookup(input: {
  categoryId: string
  cityName: string
  limit?: number
}): Promise<ProviderLookupResult> {
  try {
    const providers = await listObrtnikiPublic({
      category_id: input.categoryId,
      location_city: input.cityName,
      is_available: true,
      limit: input.limit ?? 12,
    })

    // DAL returns [] for both empty and errors. We can only treat [] as definitive
    // when we also have a successful upstream marketplace resolver response.
    return { ok: true, providers, hasProviders: providers.length > 0 }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
