import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { assertInquiryTransition } from '@/lib/agent/state-machine/inquiryMachine'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mock Supabase
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('InquiryMachine', () => {
  let mockSelect: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { status: 'pending', id: 'test-inquiry-1' },
        error: null,
      }),
    }

    ;(supabaseAdmin.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue(mockSelect),
    }))
  })

  describe('valid transitions', () => {
    it('pending → offer_received: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'offer_received')
      ).toBeUndefined()
    })

    it('pending → closed: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'closed')
      ).toBeUndefined()
    })

    it('offer_received → accepted: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'offer_received' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'accepted')
      ).toBeUndefined()
    })

    it('offer_received → pending: allowed (re-open)', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'offer_received' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'pending')
      ).toBeUndefined()
    })

    it('accepted → completed: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'accepted' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'completed')
      ).toBeUndefined()
    })

    it('accepted → closed: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'accepted' },
        error: null,
      })

      expect(
        await assertInquiryTransition('test-inquiry-1', 'closed')
      ).toBeUndefined()
    })
  })

  describe('invalid transitions — must throw 409', () => {
    it('pending → accepted: blocked', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'accepted')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('pending → completed: blocked', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'completed')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('completed → pending: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'completed' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'pending')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('completed → accepted: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'completed' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'accepted')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('closed → pending: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'closed' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'pending')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('closed → accepted: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'closed' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'accepted')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })
  })

  describe('edge cases', () => {
    it('throws 404 if inquiry does not exist', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      await expect(
        assertInquiryTransition('nonexistent-id', 'offer_received')
      ).rejects.toEqual(expect.objectContaining({ code: 404 }))
    })

    it('throws 500 if DB error occurs', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('DB connection failed'),
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', 'offer_received')
      ).rejects.toEqual(expect.objectContaining({ code: 500 }))
    })

    it('throws 409 if targetStatus is empty string', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertInquiryTransition('test-inquiry-1', '')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('fetches inquiry correctly with proper SQL', async () => {
      const selectFn = vi.fn().mockReturnValue(mockSelect)
      ;(supabaseAdmin.from as any).mockReturnValue({
        select: selectFn,
      })

      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await assertInquiryTransition('test-inquiry-1', 'offer_received')

      expect(selectFn).toHaveBeenCalledWith('status')
      expect(mockSelect.eq).toHaveBeenCalledWith('id', 'test-inquiry-1')
    })
  })
})
