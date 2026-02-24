/**
 * Schema Guard - Validates tool parameters against Zod schemas
 * Ensures all incoming data has correct shape and types before processing
 */

import { z } from 'zod'

// Define Zod schemas for each tool
const toolSchemas = {
  // Inquiry tools
  createInquiry: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
    category: z.string().optional(),
  }),

  submitOffer: z.object({
    inquiryId: z.string().uuid('Invalid inquiry ID'),
    amount: z.number().positive('Amount must be positive'),
    message: z.string().min(5, 'Message must be at least 5 characters').max(1000),
    priceType: z.enum(['fixed', 'hourly', 'estimate']).optional(),
  }),

  // Escrow tools
  captureEscrow: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
  }),

  releaseEscrow: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
    confirmedByCustomer: z.boolean().optional(),
  }),

  refundEscrow: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
    reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  }),

  openDispute: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
    description: z.string().optional(),
  }),

  resolveDispute: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
    resolution: z.enum(['full_refund', 'release_to_partner', 'partial_refund']),
    adminNotes: z.string().optional(),
  }),

  // Inquiry view/fetch
  getInquiry: z.object({
    inquiryId: z.string().uuid('Invalid inquiry ID'),
  }),

  getOffers: z.object({
    inquiryId: z.string().uuid('Invalid inquiry ID'),
  }),

  getEscrow: z.object({
    escrowId: z.string().uuid('Invalid escrow ID'),
  }),

  // Partner tools
  updateProfile: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().email('Invalid email').optional(),
    phone: z.string().min(5).max(20).optional(),
    bio: z.string().max(500).optional(),
  }),
}

/**
 * Validate tool parameters against schema
 * Throws 400 if validation fails
 */
export async function schemaGuard(toolName: string, params: unknown): Promise<void> {
  const schema = toolSchemas[toolName as keyof typeof toolSchemas]

  if (!schema) {
    throw {
      success: false,
      error: `Unknown tool: ${toolName}`,
      code: 400,
    }
  }

  try {
    await schema.parseAsync(params)
  } catch (error: any) {
    const zodError = error as z.ZodError
    const message = zodError.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')

    throw {
      success: false,
      error: `Invalid parameters: ${message}`,
      code: 400,
    }
  }
}
