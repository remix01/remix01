import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals'
import { assertEscrowTransition } from '@/lib/agent/state-machine/escrowMachine'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mock Supabase
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('EscrowMachine', () => {
  let mockSelect: any
  let mockUpdate: any
  let mockDelete: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock select chain
    mockSelect = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { status: 'pending', id: 'test-escrow-1' },
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: { status: 'pending', id: 'test-escrow-1' },
        error: null,
      }),
    }

    // Mock update chain
    mockUpdate = {
      eq: vi.fn().mockReturnThis(),
    }

    // Mock delete chain
    mockDelete = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    // Mock from method
    ;(supabaseAdmin.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue(mockSelect),
      update: vi.fn().mockReturnValue(mockUpdate),
      delete: vi.fn().mockReturnValue(mockDelete),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-escrow-1', status: 'pending' },
          error: null,
        }),
      }),
    }))
  })

  describe('valid transitions', () => {
    it('pending → paid: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending', id: 'test-escrow-1' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'paid')
      ).toBeUndefined()
    })

    it('pending → cancelled: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'cancelled')
      ).toBeUndefined()
    })

    it('paid → released: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'paid' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'released')
      ).toBeUndefined()
    })

    it('paid → refunded: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'paid' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'refunded')
      ).toBeUndefined()
    })

    it('paid → disputed: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'paid' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'disputed')
      ).toBeUndefined()
    })

    it('disputed → released: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'disputed' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'released')
      ).toBeUndefined()
    })

    it('disputed → refunded: allowed', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'disputed' },
        error: null,
      })

      expect(
        await assertEscrowTransition('test-escrow-1', 'refunded')
      ).toBeUndefined()
    })
  })

  describe('invalid transitions — must throw 409', () => {
    it('pending → captured: blocked', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'captured')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('pending → released: blocked', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'released')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('active → released: blocked (non-existent transition)', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'released')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('released → active: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'released' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'active')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('released → captured: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'released' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'captured')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('refunded → active: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'refunded' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'active')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('refunded → released: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'refunded' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'released')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('cancelled → disputed: blocked — terminal state', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'cancelled' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'disputed')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })
  })

  describe('edge cases', () => {
    it('throws 404 if escrowId does not exist', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      await expect(
        assertEscrowTransition('nonexistent-id', 'paid')
      ).rejects.toEqual(expect.objectContaining({ code: 404 }))
    })

    it('throws 500 if DB error occurs', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('DB connection failed'),
      })

      await expect(
        assertEscrowTransition('test-escrow-1', 'paid')
      ).rejects.toEqual(expect.objectContaining({ code: 500 }))
    })

    it('throws 409 if targetStatus is empty string', async () => {
      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      })

      await expect(
        assertEscrowTransition('test-escrow-1', '')
      ).rejects.toEqual(expect.objectContaining({ code: 409 }))
    })

    it('fetches and validates current status correctly', async () => {
      const selectFn = vi.fn().mockReturnValue(mockSelect)
      ;(supabaseAdmin.from as any).mockReturnValue({
        select: selectFn,
        update: vi.fn(),
      })

      mockSelect.maybeSingle.mockResolvedValueOnce({
        data: { status: 'paid' },
        error: null,
      })

      await assertEscrowTransition('test-escrow-1', 'released')

      expect(selectFn).toHaveBeenCalledWith('status')
      expect(mockSelect.eq).toHaveBeenCalledWith('id', 'test-escrow-1')
    })
  })
})
