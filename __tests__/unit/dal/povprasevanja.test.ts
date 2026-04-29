import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { makeChain, makeSupabaseClient } from '../../helpers/supabase.mock'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/push-notifications')
jest.mock('@/lib/jobs/queue')
jest.mock('@/lib/dal/categories')

import { createClient } from '@/lib/supabase/server'
import { sendPushToObrtnikiByCategory } from '@/lib/push-notifications'
import { enqueue } from '@/lib/jobs/queue'
import { getOrCreateCategory } from '@/lib/dal/categories'

import {
  getPovprasevanje,
  listPovprasevanja,
  getOpenPovprasevanjaForObrtnik,
  createPovprasevanje,
  updatePovprasevanje,
  deletePovprasevanje,
  cancelPovprasevanje,
  countNarocnikPovprasevanjaByStatus,
} from '@/lib/dal/povprasevanja'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockSendPush = sendPushToObrtnikiByCategory as jest.MockedFunction<typeof sendPushToObrtnikiByCategory>
const mockEnqueue = enqueue as jest.MockedFunction<typeof enqueue>
const mockGetOrCreateCategory = getOrCreateCategory as jest.MockedFunction<typeof getOrCreateCategory>

// ─── Fixtures ────────────────────────────────────────────────────────────────

const basePovprasevanje = {
  id: 'pov-1',
  title: 'Popravilo pipe',
  description: 'Teče voda',
  location_city: 'Ljubljana',
  status: 'odprto',
  narocnik_id: 'user-123',
  category_id: 'cat-1',
  urgency: 'takoj',
  budget_max: 500,
  narocnik: { id: 'user-123', full_name: 'Test Naročnik' },
  category: { id: 'cat-1', name: 'Vodovodne storitve' },
  ponudbe: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getPovprasevanje', () => {
  it('returns null on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getPovprasevanje('pov-1')
    expect(result).toBeNull()
  })

  it('attaches ponudbe_count from nested ponudbe array', async () => {
    const data = { ...basePovprasevanje, ponudbe: [{ id: 'p1', status: 'nova' }, { id: 'p2', status: 'nova' }] }
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getPovprasevanje('pov-1')
    expect(result).not.toBeNull()
    expect((result as any).ponudbe_count).toBe(2)
  })

  it('returns ponudbe_count of 0 when ponudbe array is empty', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePovprasevanje, ponudbe: [] }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getPovprasevanje('pov-1')
    expect((result as any).ponudbe_count).toBe(0)
  })
})

describe('listPovprasevanja', () => {
  it('returns empty array on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await listPovprasevanja()
    expect(result).toEqual([])
  })

  it('applies all filters to the query chain', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await listPovprasevanja({
      status: 'odprto',
      category_id: 'cat-1',
      location_city: 'Ljubljana',
      urgency: 'takoj',
      budget_max: 1000,
      limit: 5,
      offset: 10,
    })

    expect(chain.eq).toHaveBeenCalledWith('status', 'odprto')
    expect(chain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    expect(chain.eq).toHaveBeenCalledWith('location_city', 'Ljubljana')
    expect(chain.eq).toHaveBeenCalledWith('urgency', 'takoj')
    expect(chain.lte).toHaveBeenCalledWith('budget_max', 1000)
    expect(chain.limit).toHaveBeenCalledWith(5)
    expect(chain.range).toHaveBeenCalledWith(10, 14)
  })

  it('adds ponudbe_count to each result', async () => {
    const data = [
      { ...basePovprasevanje, id: 'pov-1', ponudbe: [{ id: 'p1' }, { id: 'p2' }] },
      { ...basePovprasevanje, id: 'pov-2', ponudbe: [] },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await listPovprasevanja()
    expect((results[0] as any).ponudbe_count).toBe(2)
    expect((results[1] as any).ponudbe_count).toBe(0)
  })
})

describe('getOpenPovprasevanjaForObrtnik', () => {
  it('filters out povprasevanja where obrtnik already submitted a ponudba', async () => {
    const data = [
      { ...basePovprasevanje, id: 'pov-1', ponudbe: [{ id: 'p1', obrtnik_id: 'obr-1' }] },
      { ...basePovprasevanje, id: 'pov-2', ponudbe: [{ id: 'p2', obrtnik_id: 'obr-99' }] },
      { ...basePovprasevanje, id: 'pov-3', ponudbe: [] },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await getOpenPovprasevanjaForObrtnik('obr-1')
    const ids = results.map((r: any) => r.id)
    expect(ids).not.toContain('pov-1')
    expect(ids).toContain('pov-2')
    expect(ids).toContain('pov-3')
  })

  it('returns all items when obrtnik has no existing ponudbe', async () => {
    const data = [
      { ...basePovprasevanje, id: 'pov-1', ponudbe: [{ id: 'p1', obrtnik_id: 'obr-other' }] },
      { ...basePovprasevanje, id: 'pov-2', ponudbe: [] },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const results = await getOpenPovprasevanjaForObrtnik('obr-new')
    expect(results).toHaveLength(2)
  })

  it('returns empty array on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const results = await getOpenPovprasevanjaForObrtnik('obr-1')
    expect(results).toEqual([])
  })

  it('filters by category IDs when provided', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await getOpenPovprasevanjaForObrtnik('obr-1', ['cat-1', 'cat-2'])
    expect(chain.in).toHaveBeenCalledWith('category_id', ['cat-1', 'cat-2'])
  })
})

describe('createPovprasevanje', () => {
  beforeEach(() => {
    mockSendPush.mockResolvedValue(undefined as any)
    mockEnqueue.mockResolvedValue(undefined as any)
    mockGetOrCreateCategory.mockResolvedValue('cat-auto')
  })

  it('returns null when DB insert fails', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Insert failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await createPovprasevanje({
      narocnik_id: 'user-123',
      title: 'Test',
      description: 'Desc',
      location_city: 'Maribor',
    } as any)
    expect(result).toBeNull()
  })

  it('forces status to "odprto" regardless of input', async () => {
    const insertChain = makeChain({ data: { ...basePovprasevanje }, error: null })
    const client = makeSupabaseClient(() => insertChain)
    mockCreateClient.mockResolvedValue(client as any)

    await createPovprasevanje({
      narocnik_id: 'user-123',
      title: 'Test',
      description: 'Desc',
      location_city: 'Ljubljana',
    } as any)

    const insertCall = (insertChain.insert as jest.Mock).mock.calls[0]?.[0] as any
    expect(insertCall?.status).toBe('odprto')
  })

  it('throws when user is not authenticated and no narocnik_id provided', async () => {
    const client = makeSupabaseClient(() => makeChain({ data: null, error: null }))
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null } as any)
    mockCreateClient.mockResolvedValue(client as any)

    await expect(
      createPovprasevanje({ title: 'Test', description: 'Desc', location_city: 'Ljubljana' } as any)
    ).rejects.toThrow('Not authenticated')
  })

  it('auto-creates category via getOrCreateCategory when categoryName is passed', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePovprasevanje }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await createPovprasevanje(
      { narocnik_id: 'user-123', title: 'Test', description: 'Desc', location_city: 'Ljubljana' } as any,
      { categoryName: 'Elektrika' }
    )
    expect(mockGetOrCreateCategory).toHaveBeenCalledWith('Elektrika', undefined, undefined)
  })

  it('sends push notification after successful insert', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePovprasevanje }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await createPovprasevanje({
      narocnik_id: 'user-123',
      title: 'Popravilo pipe',
      description: 'Desc',
      location_city: 'Ljubljana',
      category_id: 'cat-1',
    } as any)

    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' })
    )
  })

  it('enqueues confirmation email after successful insert', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePovprasevanje }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await createPovprasevanje({
      narocnik_id: 'user-123',
      title: 'Popravilo pipe',
      description: 'Desc',
      location_city: 'Ljubljana',
    } as any)

    expect(mockEnqueue).toHaveBeenCalledWith(
      'sendEmail',
      expect.objectContaining({ jobType: 'povprasevanje_confirmation' })
    )
  })

  it('does not fail if push notification throws', async () => {
    mockSendPush.mockRejectedValue(new Error('Push service down') as never)
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePovprasevanje }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await expect(
      createPovprasevanje({
        narocnik_id: 'user-123',
        title: 'Test',
        description: 'Desc',
        location_city: 'Ljubljana',
        category_id: 'cat-1',
      } as any)
    ).resolves.not.toBeNull()
  })
})

describe('deletePovprasevanje', () => {
  it('returns false and does not delete when ponudbe exist', async () => {
    // First from() call: check ponudbe — returns one ponudba
    const ponudbeChain = makeChain({ data: [{ id: 'p1' }], error: null })
    // Second from() call: delete — should not be reached
    const deleteChain = makeChain({ data: null, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(ponudbeChain)
      .mockReturnValueOnce(deleteChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await deletePovprasevanje('pov-1')
    expect(result).toBe(false)
    expect(deleteChain.delete).not.toHaveBeenCalled()
  })

  it('returns true when no ponudbe exist and delete succeeds', async () => {
    const ponudbeChain = makeChain({ data: [], error: null })
    const deleteChain = makeChain({ data: null, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(ponudbeChain)
      .mockReturnValueOnce(deleteChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await deletePovprasevanje('pov-1')
    expect(result).toBe(true)
  })

  it('returns false when delete query fails', async () => {
    const ponudbeChain = makeChain({ data: [], error: null })
    const deleteChain = makeChain({ data: null, error: { message: 'Delete failed' } })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(ponudbeChain)
      .mockReturnValueOnce(deleteChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await deletePovprasevanje('pov-1')
    expect(result).toBe(false)
  })
})

describe('cancelPovprasevanje', () => {
  it('sets status to "preklicano"', async () => {
    const updateChain = makeChain({ data: { ...basePovprasevanje, status: 'preklicano' }, error: null })
    const client = makeSupabaseClient(() => updateChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await cancelPovprasevanje('pov-1')
    expect(result).toBe(true)
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'preklicano' })
    )
  })

  it('returns false when update fails', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Update failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await cancelPovprasevanje('pov-1')
    expect(result).toBe(false)
  })
})

describe('countNarocnikPovprasevanjaByStatus', () => {
  it('groups status counts correctly', async () => {
    const data = [
      { status: 'odprto' },
      { status: 'odprto' },
      { status: 'zakljuceno' },
      { status: 'preklicano' },
      { status: 'odprto' },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const counts = await countNarocnikPovprasevanjaByStatus('user-123')
    expect(counts).toEqual({ odprto: 3, zakljuceno: 1, preklicano: 1 })
  })

  it('returns empty object on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const counts = await countNarocnikPovprasevanjaByStatus('user-123')
    expect(counts).toEqual({})
  })

  it('returns empty object when user has no povprasevanja', async () => {
    const client = makeSupabaseClient(() => makeChain({ data: [], error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const counts = await countNarocnikPovprasevanjaByStatus('user-123')
    expect(counts).toEqual({})
  })
})
