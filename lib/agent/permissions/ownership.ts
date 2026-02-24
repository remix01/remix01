/**
 * Ownership-Based Access Control
 * Verifies that a user owns or has admin access to a resource
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { Role } from './roles'

type ResourceType = 'inquiry' | 'offer' | 'escrow'

/**
 * Check if user owns a resource or is an admin
 * @param resource The type of resource to check
 * @param id The ID of the resource
 * @param userId The ID of the user making the request
 * @param userRole The role of the user
 * @throws Error with code 403 if user doesn't own the resource and isn't admin
 */
export async function assertOwnership(
  resource: ResourceType,
  id: string,
  userId: string,
  userRole: Role
): Promise<void> {
  // Admins always have access
  if (userRole === 'admin') {
    return
  }

  try {
    switch (resource) {
      case 'inquiry': {
        // Inquiries are identified by email (customer-submitted)
        const { data } = await supabaseAdmin
          .from('inquiries')
          .select('email')
          .eq('id', id)
          .maybeSingle()

        if (!data) {
          throw new OwnershipError('Resource not found')
        }

        // Get user email from auth
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (!user || user.email !== data.email) {
          throw new OwnershipError('Forbidden')
        }
        break
      }

      case 'offer': {
        // Offers have partner_id (who created the offer)
        const { data } = await supabaseAdmin
          .from('offers')
          .select('partner_id')
          .eq('id', id)
          .maybeSingle()

        if (!data) {
          throw new OwnershipError('Resource not found')
        }

        if (data.partner_id !== userId && userRole !== 'partner') {
          throw new OwnershipError('Forbidden')
        }
        break
      }

      case 'escrow': {
        // Escrow: partner_id OR customer_email
        const { data } = await supabaseAdmin
          .from('escrow_transactions')
          .select('partner_id, customer_email')
          .eq('id', id)
          .maybeSingle()

        if (!data) {
          throw new OwnershipError('Resource not found')
        }

        // Check if user is the partner
        if (data.partner_id === userId) {
          return
        }

        // Check if user is the customer (match email)
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (authUser && authUser.email === data.customer_email) {
          return
        }

        throw new OwnershipError('Forbidden')
      }

      default: {
        throw new OwnershipError(`Unknown resource type: ${resource}`)
      }
    }
  } catch (error) {
    if (error instanceof OwnershipError) {
      throw error
    }
    // Log actual error but return generic message
    console.error(`[OWNERSHIP] Error checking ${resource}:`, error)
    throw new OwnershipError('Forbidden')
  }
}

/**
 * Custom error for ownership failures
 */
class OwnershipError extends Error {
  code: number

  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
    this.code = 403
  }
}

export { OwnershipError }
