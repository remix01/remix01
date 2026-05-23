/**
 * Agent Feature Flags (Rec 5)
 *
 * Reads from the `agent_flags` table.  Results are cached for FLAG_TTL_MS to
 * avoid a DB round-trip on every request.  Cache is invalidated automatically
 * on TTL expiry; call `invalidateCache()` from admin routes when toggling flags.
 */

import { createAdminClient } from '@/lib/supabase/server'

const FLAG_TTL_MS = 60_000  // 60 s

let cache: Map<string, boolean> | null = null
let cacheExpiresAt = 0

async function loadFlags(): Promise<Map<string, boolean>> {
  if (cache && Date.now() < cacheExpiresAt) return cache

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('agent_flags' as any)
      .select('flag_name, enabled')

    const map = new Map<string, boolean>()
    for (const row of data ?? []) {
      map.set((row as any).flag_name, !!(row as any).enabled)
    }
    cache = map
    cacheExpiresAt = Date.now() + FLAG_TTL_MS
    return map
  } catch {
    return cache ?? new Map()
  }
}

export async function isFeatureEnabled(flagName: string, defaultValue = true): Promise<boolean> {
  const flags = await loadFlags()
  return flags.has(flagName) ? (flags.get(flagName) ?? defaultValue) : defaultValue
}

export function invalidateCache(): void {
  cache = null
  cacheExpiresAt = 0
}
