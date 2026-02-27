import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { assertOfferTransition } from '@/lib/agent/state-machine/offerMachine'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mock Supabase
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('OfferMachine', () => {
  let mockSelect: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { status: 'poslana', id: 'test-offer-1' },
        error: null,
      }),
    }

    ;(supabaseAdmin.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue(mockSelect),
    }))
  })

  describe('valid transitions', () => {
    it('poslana → sprejeta: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'poslana' },
        error: null,
      })

      expect(
        await assertOfferTransition('test-offer-1', 'sprejeta')
      ).toBeUndefined()
    })

    it('poslana → zavrnjena: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'poslana' },
        error: null,
      })

      expect(
        await assertOfferTransition('test-offer-1', 'zavrnjena')
      ).toBeUndefined()
    })
  })

  describe('invalid transitions — must throw 409', () => {
    it('sprejeta → zavrnjena: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'sprejeta' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', 'zavrnjena')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('sprejeta → poslana: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'sprejeta' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', 'poslana')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('zavrnjena → sprejeta: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'zavrnjena' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', 'sprejeta')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('zavrnjena → poslana: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'zavrnjena' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', 'poslana')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })
  })

  describe('edge cases', () => {
    it('throws 404 if offer does not exist', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      await expect(
        assertOfferTransition('nonexistent-id', 'sprejeta')
      ).rejects.toEqual(expect.objectContaining({ code: 404 }))
    })

    it('throws 500 if DB error occurs', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('DB connection failed'),
      })

      await expect(
        assertOfferTransition('test-offer-1', 'sprejeta')
      ).rejects.toEqual(expect.objectContaining({ code: 500 }))
    })

    it('throws 409 if targetStatus is empty string', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'poslana' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', '')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('throws 409 if targetStatus is undefined', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'poslana' },
        error: null,
      })

      await expect(
        assertOfferTransition('test-offer-1', undefined as any)
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('fetches offer correctly with proper SQL', async () => {
      const selectFn = vi.fn().mockReturnValue(mockSelect)
      ;(supabaseAdmin.from as any).mockReturnValue({
        select: selectFn,
      })

      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'poslana' },
        error: null,
      })

      await assertOfferTransition('test-offer-1', 'sprejeta')

      expect(selectFn).toHaveBeenCalledWith('status')
      expect(mockSelect.eq).toHaveBeenCalledWith('id', 'test-offer-1')
    })
  })
})
