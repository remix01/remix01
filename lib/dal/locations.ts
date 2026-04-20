import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'

function normalizeLocationName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Ensures a location exists in public.locations and returns canonical city name.
 * Falls back to original input when locations table is unavailable.
 */
export async function getOrCreateLocation(name: string): Promise<string> {
  const normalized = normalizeLocationName(name)
  if (!normalized) return name

  const supabase = await createClient()
  const db = supabase as any

  const { data: existing, error: findError } = await db
    .from('locations')
    .select('name')
    .ilike('name', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (!findError && existing?.name) {
    return existing.name
  }

  // If the table doesn't exist yet (older environments), gracefully skip.
  if (findError && (findError.code === '42P01' || findError.code === 'PGRST205')) {
    return normalized
  }

  const baseSlug = slugify(normalized)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data: slugMatch, error: slugError } = await db
      .from('locations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugError && (slugError.code === '42P01' || slugError.code === 'PGRST205')) {
      return normalized
    }

    if (!slugMatch) break
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const { data: inserted, error: insertError } = await db
    .from('locations')
    .insert({
      name: normalized,
      slug,
      is_active: true,
      is_auto_created: true,
    })
    .select('name')
    .single()

  if (!insertError && inserted?.name) return inserted.name

  // Unique race-safe retry
  const { data: retry } = await db
    .from('locations')
    .select('name')
    .ilike('name', normalized)
    .eq('is_active', true)
    .maybeSingle()

  return retry?.name || normalized
}
