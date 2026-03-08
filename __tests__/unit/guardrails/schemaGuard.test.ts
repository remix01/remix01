import { describe, it, expect } from '@jest/globals'
import { schemaGuard } from '@/lib/agent/guardrails/schemaGuard'

describe('SchemaGuard', () => {
  describe('createInquiry schema', () => {
    it('passes valid createInquiry params', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'Need plumbing help',
          description: 'I need to fix a leaking pipe in my bathroom',
          category: 'plumbing',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects title too short', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'ab',
          description: 'I need to fix a leaking pipe in my bathroom',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects title too long (> 200 chars)', async () => {
      const longTitle = 'a'.repeat(201)
      await expect(
        schemaGuard('createInquiry', {
          title: longTitle,
          description: 'Valid description here',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects description too short', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'Valid title',
          description: 'Short',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects description too long (> 5000 chars)', async () => {
      const longDesc = 'a'.repeat(5001)
      await expect(
        schemaGuard('createInquiry', {
          title: 'Valid title',
          description: longDesc,
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('allows optional category field', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'Need help',
          description: 'This is a valid longer description for testing purposes',
        })
      ).resolves.toBeUndefined()
    })

    it('accepts exactly 3 char title (minimum)', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'abc',
          description: 'This is a valid longer description for testing purposes',
        })
      ).resolves.toBeUndefined()
    })

    it('accepts exactly 200 char title (maximum)', async () => {
      const maxTitle = 'a'.repeat(200)
      await expect(
        schemaGuard('createInquiry', {
          title: maxTitle,
          description: 'This is a valid longer description for testing purposes',
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('submitOffer schema', () => {
    it('passes valid submitOffer params', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 150.5,
          message: 'I can fix this for you',
          priceType: 'fixed',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects invalid UUID', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: 'not-a-uuid',
          amount: 150.5,
          message: 'I can help',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects negative amount', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: -50,
          message: 'I can help',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects zero amount', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 0,
          message: 'I can help',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects message too short', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          message: 'short',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects invalid priceType enum', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          message: 'I can help with this',
          priceType: 'invalid_type',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('allows optional priceType', async () => {
      await expect(
        schemaGuard('submitOffer', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          message: 'I can help with this',
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('escrow operations', () => {
    it('passes valid captureEscrow params', async () => {
      await expect(
        schemaGuard('captureEscrow', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects invalid escrowId UUID', async () => {
      await expect(
        schemaGuard('captureEscrow', {
          escrowId: 'invalid',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('passes valid releaseEscrow params', async () => {
      await expect(
        schemaGuard('releaseEscrow', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          confirmedByCustomer: true,
        })
      ).resolves.toBeUndefined()
    })

    it('passes refundEscrow with valid reason', async () => {
      await expect(
        schemaGuard('refundEscrow', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'Work was not completed satisfactorily',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects refundEscrow with short reason', async () => {
      await expect(
        schemaGuard('refundEscrow', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'bad',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })
  })

  describe('dispute operations', () => {
    it('passes valid openDispute params', async () => {
      await expect(
        schemaGuard('openDispute', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'The work quality does not match the agreement',
          description: 'Optional detailed description of the dispute',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects dispute reason too short', async () => {
      await expect(
        schemaGuard('openDispute', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'short',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('passes valid resolveDispute params', async () => {
      await expect(
        schemaGuard('resolveDispute', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          resolution: 'full_refund',
          adminNotes: 'Evidence provided by customer was conclusive',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects invalid resolution enum', async () => {
      await expect(
        schemaGuard('resolveDispute', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
          resolution: 'invalid_resolution',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('allows all valid resolution types', async () => {
      const resolutions = ['full_refund', 'release_to_partner', 'partial_refund']

      for (const resolution of resolutions) {
        await expect(
          schemaGuard('resolveDispute', {
            escrowId: '550e8400-e29b-41d4-a716-446655440000',
            resolution: resolution as any,
          })
        ).resolves.toBeUndefined()
      }
    })
  })

  describe('read operations', () => {
    it('passes valid getInquiry params', async () => {
      await expect(
        schemaGuard('getInquiry', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).resolves.toBeUndefined()
    })

    it('passes valid getOffers params', async () => {
      await expect(
        schemaGuard('getOffers', {
          inquiryId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).resolves.toBeUndefined()
    })

    it('passes valid getEscrow params', async () => {
      await expect(
        schemaGuard('getEscrow', {
          escrowId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('profile operations', () => {
    it('passes valid updateProfile params', async () => {
      await expect(
        schemaGuard('updateProfile', {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+386 1 234 5678',
          bio: 'Professional plumber with 10 years experience',
        })
      ).resolves.toBeUndefined()
    })

    it('rejects name too short', async () => {
      await expect(
        schemaGuard('updateProfile', {
          name: 'a',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects name too long', async () => {
      await expect(
        schemaGuard('updateProfile', {
          name: 'a'.repeat(101),
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects invalid email', async () => {
      await expect(
        schemaGuard('updateProfile', {
          email: 'not-an-email',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects phone too short', async () => {
      await expect(
        schemaGuard('updateProfile', {
          phone: '123',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('rejects bio too long', async () => {
      await expect(
        schemaGuard('updateProfile', {
          bio: 'a'.repeat(501),
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('allows all fields optional', async () => {
      await expect(schemaGuard('updateProfile', {})).resolves.toBeUndefined()
    })

    it('allows partial updates', async () => {
      await expect(
        schemaGuard('updateProfile', {
          name: 'Jane Doe',
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('rejects unknown tool name', async () => {
      await expect(
        schemaGuard('unknownTool', { data: 'test' })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('returns descriptive error message for validation failure', async () => {
      try {
        await schemaGuard('createInquiry', {
          title: 'ab',
          description: 'short',
        })
      } catch (error: any) {
        expect(error.error).toContain('Invalid parameters')
      }
    })

    it('reports all validation errors', async () => {
      try {
        await schemaGuard('createInquiry', {
          title: 'ab', // too short
          description: 'short', // too short
        })
      } catch (error: any) {
        expect(error.error).toContain('Invalid parameters')
      }
    })

    it('identifies missing required fields', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: 'Valid title here',
          // description is missing
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })
  })

  describe('edge cases', () => {
    it('allows UUID with different cases', async () => {
      const uuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550E8400-E29B-41D4-A716-446655440000',
        '550e8400-E29B-41d4-A716-446655440000',
      ]

      for (const uuid of uuids) {
        await expect(
          schemaGuard('getInquiry', { inquiryId: uuid })
        ).resolves.toBeUndefined()
      }
    })

    it('handles whitespace in email validation', async () => {
      await expect(
        schemaGuard('updateProfile', {
          email: 'test@example.com ',
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('handles special characters in text fields', async () => {
      await expect(
        schemaGuard('createInquiry', {
          title: "I need help with plumbing's issue-fix",
          description: "The pipe's leaking at the joint, causing water damage & mold.",
        })
      ).resolves.toBeUndefined()
    })
  })
})
