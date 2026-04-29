import { describe, it, expect, jest } from '@jest/globals'
import { makeChain, makeSupabaseClient } from '../../helpers/supabase.mock'

jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import {
  listVerifiedObrtniki,
  getObrtnikiById,
  getActiveSpecialnosti,
  getActiveLokacije,
} from '@/lib/dal/obrtniki'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeObrtnik(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obr-1',
    business_name: 'Janezov servis',
    description: 'Popravila',
    tagline: null,
    is_verified: true,
    avg_rating: 4.5,
    total_reviews: 10,
    is_available: true,
    subscription_tier: 'pro',
    hourly_rate: 30,
    years_experience: 5,
    created_at: '2024-01-01',
    profiles: { id: 'p-1', email: 'j@j.si', phone: null, full_name: 'Janez', location_city: 'Ljubljana', location_region: null },
    obrtnik_categories: [
      { categories: { name: 'Vodovodne storitve', slug: 'voda', icon_name: null } },
    ],
    ...overrides,
  }
}

// ─── listVerifiedObrtniki ─────────────────────────────────────────────────────

describe('listVerifiedObrtniki', () => {
  it('returns empty array on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await listVerifiedObrtniki()).toEqual([])
  })

  it('returns empty array when data is null without error', async () => {
    const client = makeSupabaseClient(() => makeChain({ data: null, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    expect(await listVerifiedObrtniki()).toEqual([])
  })

  it('flattens obrtnik_categories into a categories array', async () => {
    const raw = [makeObrtnik()]
    const client = makeSupabaseClient(() => makeChain({ data: raw, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await listVerifiedObrtniki()
    expect(results[0].categories).toEqual([
      { name: 'Vodovodne storitve', slug: 'voda', icon_name: null },
    ])
  })

  it('client-side filters by kategorija slug', async () => {
    const raw = [
      makeObrtnik({ id: 'obr-1', obrtnik_categories: [{ categories: { name: 'Voda', slug: 'voda', icon_name: null } }] }),
      makeObrtnik({ id: 'obr-2', obrtnik_categories: [{ categories: { name: 'Elektrika', slug: 'elektrika', icon_name: null } }] }),
      makeObrtnik({ id: 'obr-3', obrtnik_categories: [] }),
    ]
    const client = makeSupabaseClient(() => makeChain({ data: raw, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await listVerifiedObrtniki({ kategorija: 'voda' })
    expect(results.map(r => r.id)).toEqual(['obr-1'])
  })

  it('returns all items when no kategorija filter is applied', async () => {
    const raw = [makeObrtnik({ id: 'obr-1' }), makeObrtnik({ id: 'obr-2' })]
    const client = makeSupabaseClient(() => makeChain({ data: raw, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await listVerifiedObrtniki()
    expect(results).toHaveLength(2)
  })

  it('excludes obrtnik_categories entries where categories is null', async () => {
    const raw = [
      makeObrtnik({
        obrtnik_categories: [
          { categories: { name: 'Voda', slug: 'voda', icon_name: null } },
          { categories: null },
        ],
      }),
    ]
    const client = makeSupabaseClient(() => makeChain({ data: raw, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await listVerifiedObrtniki()
    expect(results[0].categories).toHaveLength(1)
  })

  it('caps limit at 100', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await listVerifiedObrtniki({ limit: 999 })
    // range(0, 99) — limit capped at 100
    expect(chain.range).toHaveBeenCalledWith(0, 99)
  })

  it('applies minRating filter', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await listVerifiedObrtniki({ minRating: 4 })
    expect(chain.gte).toHaveBeenCalledWith('avg_rating', 4)
  })

  it('applies search filter via or()', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await listVerifiedObrtniki({ search: 'voda' })
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining('business_name.ilike.%voda%')
    )
  })
})

// ─── getObrtnikiById ──────────────────────────────────────────────────────────

describe('getObrtnikiById', () => {
  it('returns null when not found or error', async () => {
    const client = makeSupabaseClient(() => makeChain({ data: null, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getObrtnikiById('obr-missing')).toBeNull()
  })

  it('returns null on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getObrtnikiById('obr-1')).toBeNull()
  })

  it('flattens categories from obrtnik_categories', async () => {
    const raw = makeObrtnik()
    const client = makeSupabaseClient(() => makeChain({ data: raw, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getObrtnikiById('obr-1')
    expect(result?.categories).toEqual([
      { name: 'Vodovodne storitve', slug: 'voda', icon_name: null },
    ])
  })
})

// ─── getActiveSpecialnosti ────────────────────────────────────────────────────

describe('getActiveSpecialnosti', () => {
  it('returns categories sorted by sort_order', async () => {
    const data = [
      { name: 'Elektrika', slug: 'elektrika' },
      { name: 'Voda', slug: 'voda' },
    ]
    const chain = makeChain({ data, error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getActiveSpecialnosti()
    expect(result).toEqual(data)
    expect(chain.order).toHaveBeenCalledWith('sort_order')
  })

  it('returns empty array on error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getActiveSpecialnosti()).toEqual([])
  })
})

// ─── getActiveLokacije ────────────────────────────────────────────────────────

describe('getActiveLokacije', () => {
  it('returns empty array on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getActiveLokacije()).toEqual([])
  })

  it('deduplicates city names', async () => {
    const data = [
      { profiles: { location_city: 'Ljubljana' } },
      { profiles: { location_city: 'Ljubljana' } },
      { profiles: { location_city: 'Maribor' } },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getActiveLokacije()
    // Unique only
    expect(result.filter(c => c === 'Ljubljana')).toHaveLength(1)
    expect(result).toContain('Maribor')
  })

  it('returns cities in alphabetical order', async () => {
    const data = [
      { profiles: { location_city: 'Maribor' } },
      { profiles: { location_city: 'Celje' } },
      { profiles: { location_city: 'Ljubljana' } },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getActiveLokacije()
    expect(result).toEqual(['Celje', 'Ljubljana', 'Maribor'])
  })

  it('handles profiles returned as an array (Supabase join shape)', async () => {
    const data = [
      { profiles: [{ location_city: 'Koper' }] },
      { profiles: [{ location_city: 'Kranj' }] },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getActiveLokacije()
    expect(result).toContain('Koper')
    expect(result).toContain('Kranj')
  })

  it('ignores null city values', async () => {
    const data = [
      { profiles: { location_city: null } },
      { profiles: { location_city: 'Ljubljana' } },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getActiveLokacije()
    expect(result).not.toContain(null)
    expect(result).toEqual(['Ljubljana'])
  })
})
