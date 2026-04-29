import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { makeChain, makeSupabaseClient } from '../../helpers/supabase.mock'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/notifications')

import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'

import {
  getPonudba,
  getPonudbeForPovprasevanje,
  getObrtnikPonudbe,
  createPonudba,
  updatePonudba,
  acceptPonudba,
  rejectPonudba,
  countObrtnikPonudbeByStatus,
  getOcenaByPonudba,
  getObrtnikOcene,
  createOcena,
  updateOcenaVisibility,
  getObrtnikAverageRating,
} from '@/lib/dal/ponudbe'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockSendNotification = sendNotification as jest.MockedFunction<typeof sendNotification>

afterEach(() => {
  jest.clearAllMocks()
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

const basePonudba = {
  id: 'pon-1',
  obrtnik_id: 'obr-1',
  status: 'nova',
  price: 200,
  povprasevanje: { id: 'pov-1', narocnik_id: 'user-narocnik', title: 'Popravilo pipe' },
  obrtnik: {
    id: 'obr-1',
    profile: { id: 'obr-1', full_name: 'Janez Obrtnik' },
  },
}

const baseOcena = {
  id: 'oc-1',
  ponudba_id: 'pon-1',
  obrtnik_id: 'obr-1',
  narocnik_id: 'user-narocnik',
  rating: 5,
  is_public: true,
}

// ─── getPonudba ────────────────────────────────────────────────────────────────

describe('getPonudba', () => {
  it('returns null on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getPonudba('pon-1')).toBeNull()
  })

  it('returns ponudba data when found', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: basePonudba, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getPonudba('pon-1')
    expect((result as any)?.id).toBe('pon-1')
  })
})

// ─── getPonudbeForPovprasevanje ────────────────────────────────────────────────

describe('getPonudbeForPovprasevanje', () => {
  it('returns empty array on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await getPonudbeForPovprasevanje('pov-1')).toEqual([])
  })

  it('orders results descending by created_at', async () => {
    const chain = makeChain({ data: [], error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await getPonudbeForPovprasevanje('pov-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})

// ─── createPonudba ─────────────────────────────────────────────────────────────

describe('createPonudba', () => {
  beforeEach(() => {
    mockSendNotification.mockResolvedValue(undefined as any)
  })

  it('returns null on DB insert error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Insert failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await createPonudba({ obrtnik_id: 'obr-1', povprasevanje_id: 'pov-1', price: 100 } as any)
    expect(result).toBeNull()
  })

  it('sends notification to naročnik after successful insert', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: basePonudba, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await createPonudba({ obrtnik_id: 'obr-1', povprasevanje_id: 'pov-1', price: 200 } as any)

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-narocnik',
        type: 'nova_ponudba',
      })
    )
  })

  it('does not send notification when narocnik_id is missing', async () => {
    const ponudbaWithoutNarocnik = { ...basePonudba, povprasevanje: { id: 'pov-1' } }
    const client = makeSupabaseClient(() =>
      makeChain({ data: ponudbaWithoutNarocnik, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    await createPonudba({ obrtnik_id: 'obr-1', povprasevanje_id: 'pov-1', price: 200 } as any)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})

// ─── acceptPonudba ─────────────────────────────────────────────────────────────

describe('acceptPonudba', () => {
  beforeEach(() => {
    mockSendNotification.mockResolvedValue(undefined as any)
  })

  it('returns true and notifies obrtnik on success', async () => {
    const updateChain = makeChain({ data: { ...basePonudba, status: 'sprejeta' }, error: null })
    const getChain = makeChain({ data: { ...basePonudba, status: 'sprejeta' }, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(updateChain) // updatePonudba
      .mockReturnValueOnce(getChain)    // getPonudba
    mockCreateClient.mockResolvedValue(client as any)

    const result = await acceptPonudba('pon-1')
    expect(result).toBe(true)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ponudba_sprejeta', userId: 'obr-1' })
    )
  })

  it('returns false when update fails', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Update failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await acceptPonudba('pon-1')
    expect(result).toBe(false)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})

// ─── rejectPonudba ─────────────────────────────────────────────────────────────

describe('rejectPonudba', () => {
  it('returns true on success', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { ...basePonudba, status: 'zavrnjena' }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await rejectPonudba('pon-1')).toBe(true)
  })

  it('sets status to "zavrnjena"', async () => {
    const chain = makeChain({ data: { ...basePonudba, status: 'zavrnjena' }, error: null })
    const client = makeSupabaseClient(() => chain)
    mockCreateClient.mockResolvedValue(client as any)

    await rejectPonudba('pon-1')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'zavrnjena' }))
  })

  it('returns false on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Update failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await rejectPonudba('pon-1')).toBe(false)
  })
})

// ─── countObrtnikPonudbeByStatus ───────────────────────────────────────────────

describe('countObrtnikPonudbeByStatus', () => {
  it('groups status counts correctly', async () => {
    const data = [
      { status: 'nova' },
      { status: 'nova' },
      { status: 'sprejeta' },
      { status: 'zavrnjena' },
    ]
    const client = makeSupabaseClient(() => makeChain({ data, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    const counts = await countObrtnikPonudbeByStatus('obr-1')
    expect(counts).toEqual({ nova: 2, sprejeta: 1, zavrnjena: 1 })
  })

  it('returns empty object on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await countObrtnikPonudbeByStatus('obr-1')).toEqual({})
  })
})

// ─── createOcena ──────────────────────────────────────────────────────────────

describe('createOcena', () => {
  beforeEach(() => {
    mockSendNotification.mockResolvedValue(undefined as any)
  })

  it('returns null when ocena for this ponudba already exists (duplicate guard)', async () => {
    // First from() call: getOcenaByPonudba finds existing
    const existingChain = makeChain({ data: baseOcena, error: null })
    // Second from() call: insert — should not be reached
    const insertChain = makeChain({ data: null, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(insertChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await createOcena({
      ponudba_id: 'pon-1',
      obrtnik_id: 'obr-1',
      narocnik_id: 'user-narocnik',
      rating: 4,
    } as any)

    expect(result).toBeNull()
    expect(insertChain.insert).not.toHaveBeenCalled()
  })

  it('inserts ocena when none exists yet', async () => {
    // First from(): no existing ocena
    const checkChain = makeChain({ data: null, error: null })
    // Second from(): insert succeeds
    const insertChain = makeChain({ data: baseOcena, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await createOcena({
      ponudba_id: 'pon-1',
      obrtnik_id: 'obr-1',
      narocnik_id: 'user-narocnik',
      rating: 5,
    } as any)

    expect(result).not.toBeNull()
    expect((result as any)?.id).toBe('oc-1')
  })

  it('sends notification to obrtnik about new review', async () => {
    const checkChain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ data: baseOcena, error: null })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain)
    mockCreateClient.mockResolvedValue(client as any)

    await createOcena({
      ponudba_id: 'pon-1',
      obrtnik_id: 'obr-1',
      narocnik_id: 'user-narocnik',
      rating: 5,
    } as any)

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'nova_ocena', userId: 'obr-1' })
    )
  })

  it('returns null on DB insert error', async () => {
    const checkChain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ data: null, error: { message: 'Insert failed' } })

    const client = makeSupabaseClient()
    ;(client.from as jest.Mock)
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain)
    mockCreateClient.mockResolvedValue(client as any)

    const result = await createOcena({
      ponudba_id: 'pon-1',
      obrtnik_id: 'obr-1',
      narocnik_id: 'user-narocnik',
      rating: 3,
    } as any)

    expect(result).toBeNull()
  })
})

// ─── updateOcenaVisibility ─────────────────────────────────────────────────────

describe('updateOcenaVisibility', () => {
  it('returns true on success', async () => {
    const client = makeSupabaseClient(() => makeChain({ data: null, error: null }))
    mockCreateClient.mockResolvedValue(client as any)

    expect(await updateOcenaVisibility('oc-1', false)).toBe(true)
  })

  it('returns false on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'Update failed' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    expect(await updateOcenaVisibility('oc-1', true)).toBe(false)
  })
})

// ─── getObrtnikAverageRating ───────────────────────────────────────────────────

describe('getObrtnikAverageRating', () => {
  it('returns avg_rating and total_reviews from DB', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: { avg_rating: 4.5, total_reviews: 12 }, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getObrtnikAverageRating('obr-1')
    expect(result).toEqual({ avg_rating: 4.5, total_reviews: 12 })
  })

  it('returns zeros on DB error', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: { message: 'DB error' } })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getObrtnikAverageRating('obr-1')
    expect(result).toEqual({ avg_rating: 0, total_reviews: 0 })
  })

  it('returns zeros when profile data is null', async () => {
    const client = makeSupabaseClient(() =>
      makeChain({ data: null, error: null })
    )
    mockCreateClient.mockResolvedValue(client as any)

    const result = await getObrtnikAverageRating('obr-1')
    expect(result).toEqual({ avg_rating: 0, total_reviews: 0 })
  })
})
