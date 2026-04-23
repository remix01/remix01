import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'
import { checkUserRateLimit, checkIpRateLimit } from '@/lib/utils/rateLimiter'
import { trackInternalMetric } from '@/lib/analytics/segmentInternal'

export async function getOrCreateCategory(
  name: string,
  userId?: string,
  ipAddress?: string
): Promise<string> {
  const trimmedName = name.trim()

  if (trimmedName.length < 2) {
    throw new Error('Kategorija mora imeti najmanj 2 znaka')
  }

  if (trimmedName.length > 100) {
    throw new Error('Kategorija ne sme biti daljša od 100 znakov')
  }

  if (!/^[a-žA-Ž0-9\s\-&]+$/u.test(trimmedName)) {
    throw new Error('Kategorija sme vsebovati samo črke, številke, presledke in vezaje')
  }

  if (userId) {
    const userLimit = await checkUserRateLimit(userId)
    if (!userLimit.allowed) {
      throw new Error(
        `Prekoračili ste limit ustvarjanja kategorij. Poskusite ponovno po ${userLimit.resetAt.toLocaleTimeString('sl-SI')}`
      )
    }
  }

  if (ipAddress) {
    const ipLimit = await checkIpRateLimit(ipAddress)
    if (!ipLimit.allowed) {
      throw new Error('Prekoračili ste limit ustvarjanja kategorij z te IP naslova')
    }
  }

  const supabase = await createClient()

  const { data: existing, error: searchError } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', trimmedName)
    .eq('is_active', true)
    .maybeSingle()

  if (searchError && searchError.code !== 'PGRST116') {
    console.error('[v0] Error searching for existing category:', searchError)
    throw new Error('Napaka pri preverjanju kategorije')
  }

  if (existing) {
    return existing.id
  }

  const baseSlug = slugify(trimmedName)
  let slug = baseSlug
  let counter = 1

  let slugExists = true
  while (slugExists) {
    const { data: slugCheck, error: slugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (slugError && slugError.code !== 'PGRST116') {
      console.error('[v0] Error checking slug:', slugError)
      throw new Error('Napaka pri generiranju slugja')
    }

    if (!slugCheck) {
      slugExists = false
    } else {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  const { data: newCategory, error: insertError } = await supabase
    .from('categories')
    .insert({
      name: trimmedName,
      slug,
      is_active: true,
      is_auto_created: true,
      icon_name: 'folder',
      description: `Uporabnik definirano - ${new Date().toLocaleDateString('sl-SI')}`,
      sort_order: 999,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[v0] Error creating category:', insertError)

    const { data: retry } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', trimmedName)
      .eq('is_active', true)
      .maybeSingle()

    if (retry) {
      return retry.id
    }

    throw new Error('Napaka pri ustvarjanju nove kategorije')
  }

  trackInternalMetric('category_auto_created', {
    categoryName: trimmedName,
    categoryId: newCategory.id,
    source: 'getOrCreateCategory',
  })

  return newCategory.id
}
