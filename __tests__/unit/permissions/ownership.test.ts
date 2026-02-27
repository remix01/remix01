import { assertOwnership, OwnershipError } from '@/lib/agent/permissions/ownership'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mock supabaseAdmin
jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: {
      admin: {
        getUserById: jest.fn(),
      },
    },
  },
}))

describe('OwnershipCheck', () => {
  const mockSupabase = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('inquiry ownership', () => {
    it('allows access when created_by matches userId', async () => {
      const userId = 'user-123'
      const userEmail = 'user@example.com'
      const inquiryId = 'inquiry-456'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { email: userEmail },
        }),
      } as any)

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: userEmail,
          },
        },
      } as any)

      // Should not throw
      await expect(
        assertOwnership('inquiry', inquiryId, userId, 'user')
      ).resolves.toBeUndefined()
    })

    it('denies access when created_by does not match userId — throws 403', async () => {
      const userId = 'user-123'
      const otherUserEmail = 'other@example.com'
      const inquiryId = 'inquiry-456'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { email: otherUserEmail },
        }),
      } as any)

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: 'user@example.com',
          },
        },
      } as any)

      await expect(
        assertOwnership('inquiry', inquiryId, userId, 'user')
      ).rejects.toThrow(OwnershipError)

      const error = new OwnershipError('Forbidden')
      expect(error.code).toBe(403)
    })

    it('checks inquiry ownership correctly', async () => {
      const inquiryId = 'inquiry-789'
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { email: 'customer@example.com' },
        }),
      } as any)

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'customer@example.com',
          },
        },
      } as any)

      await expect(
        assertOwnership('inquiry', inquiryId, 'user-id', 'user')
      ).resolves.toBeUndefined()
    })
  })

  describe('offer ownership', () => {
    it('checks offer ownership correctly', async () => {
      const offerId = 'offer-123'
      const partnerId = 'partner-456'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { partner_id: partnerId },
        }),
      } as any)

      await expect(
        assertOwnership('offer', offerId, partnerId, 'partner')
      ).resolves.toBeUndefined()
    })
  })

  describe('escrow ownership', () => {
    it('checks escrow ownership correctly', async () => {
      const escrowId = 'escrow-789'
      const partnerId = 'partner-123'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            partner_id: partnerId,
            customer_email: 'customer@example.com',
          },
        }),
      } as any)

      await expect(
        assertOwnership('escrow', escrowId, partnerId, 'partner')
      ).resolves.toBeUndefined()
    })
  })

  describe('admin access', () => {
    it('admin always passes ownership check regardless of created_by', async () => {
      const adminId = 'admin-123'
      const inquiryId = 'inquiry-456'

      // Admin should bypass all checks
      await expect(
        assertOwnership('inquiry', inquiryId, adminId, 'admin')
      ).resolves.toBeUndefined()

      // Verify supabase wasn't called
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('throws 404 if resource does not exist — not 403', async () => {
      const userId = 'user-123'
      const inquiryId = 'nonexistent-id'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
        }),
      } as any)

      await expect(
        assertOwnership('inquiry', inquiryId, userId, 'user')
      ).rejects.toThrow(OwnershipError)
    })

    it('error message never reveals actual owner ID — always says "Forbidden"', async () => {
      const userId = 'user-123'
      const otherEmail = 'other@example.com'
      const inquiryId = 'inquiry-456'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { email: otherEmail },
        }),
      } as any)

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: 'user@example.com',
          },
        },
      } as any)

      try {
        await assertOwnership('inquiry', inquiryId, userId, 'user')
      } catch (error) {
        if (error instanceof OwnershipError) {
          expect(error.message).not.toContain(otherEmail)
          expect(error.message).toBe('Forbidden')
        }
      }
    })
  })
})
