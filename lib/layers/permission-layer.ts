/**
 * Permission Layer
 * 
 * Centralized permission checking for resources and actions.
 * Works with Supabase RLS policies for multi-layer security.
 */

import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'user' | 'guest'
export type Resource = 'task' | 'inquiry' | 'offer' | 'escrow' | 'profile'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'accept' | 'complete'

export interface PermissionResult {
  allowed: boolean
  reason?: string
  code?: number
}

/**
 * Check if user has permission for an action on a resource
 * @param userId - User ID from auth
 * @param resource - Resource type
 * @param action - Action to perform
 * @param resourceId - Optional resource ID for ownership checks
 * @returns PermissionResult with allowed status and optional reason
 */
export async function checkPermission(
  userId: string | null | undefined,
  resource: Resource,
  action: Action,
  resourceId?: string
): Promise<PermissionResult> {
  // No permission without user
  if (!userId) {
    return {
      allowed: false,
      reason: 'User not authenticated',
      code: 401,
    }
  }

  try {
    const supabase = await createClient()

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return {
        allowed: false,
        reason: 'User profile not found',
        code: 404,
      }
    }

    const userRole: UserRole = (profile.role || 'user') as UserRole

    // Admin can do anything
    if (userRole === 'admin') {
      return { allowed: true }
    }

    // Permission matrix for regular users
    switch (resource) {
      case 'task':
        return checkTaskPermission(userId, action, resourceId, supabase)

      case 'inquiry':
        return checkInquiryPermission(userId, action, resourceId, supabase)

      case 'offer':
        return checkOfferPermission(userId, action, resourceId, supabase)

      case 'escrow':
        return checkEscrowPermission(userId, action, resourceId, supabase)

      case 'profile':
        // Users can only modify their own profile
        if (resourceId && resourceId !== userId) {
          return {
            allowed: false,
            reason: 'Cannot modify other user profiles',
            code: 403,
          }
        }
        return { allowed: action !== 'delete' } // Can delete own profile

      default:
        return {
          allowed: false,
          reason: 'Unknown resource type',
          code: 400,
        }
    }
  } catch (error) {
    console.error('[v0] Permission check error:', error)
    return {
      allowed: false,
      reason: 'Permission check failed',
      code: 500,
    }
  }
}

async function checkTaskPermission(
  userId: string,
  action: Action,
  taskId: string | undefined,
  supabase: any
): Promise<PermissionResult> {
  // Create: user can create their own tasks
  if (action === 'create') {
    return { allowed: true }
  }

  // For other actions, need task ID
  if (!taskId) {
    return {
      allowed: false,
      reason: 'Task ID required for this action',
      code: 400,
    }
  }

  // Check task ownership
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    return {
      allowed: false,
      reason: 'Task not found',
      code: 404,
    }
  }

  // User owns task or is authorized worker
  const isOwner = task.user_id === userId
  const isAuthorized = ['publish', 'update', 'delete'].includes(action) ? isOwner : true

  return isAuthorized
    ? { allowed: true }
    : {
        allowed: false,
        reason: 'Not task owner',
        code: 403,
      }
}

async function checkInquiryPermission(
  userId: string,
  action: Action,
  inquiryId: string | undefined,
  supabase: any
): Promise<PermissionResult> {
  if (action === 'create') {
    return { allowed: true }
  }

  if (!inquiryId) {
    return {
      allowed: false,
      reason: 'Inquiry ID required for this action',
      code: 400,
    }
  }

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('user_id')
    .eq('id', inquiryId)
    .single()

  const isOwner = inquiry?.user_id === userId
  return isOwner || action === 'read'
    ? { allowed: true }
    : {
        allowed: false,
        reason: 'Not inquiry owner',
        code: 403,
      }
}

async function checkOfferPermission(
  userId: string,
  action: Action,
  offerId: string | undefined,
  supabase: any
): Promise<PermissionResult> {
  if (action === 'create') {
    return { allowed: true }
  }

  if (!offerId) {
    return {
      allowed: false,
      reason: 'Offer ID required for this action',
      code: 400,
    }
  }

  const { data: offer } = await supabase
    .from('offers')
    .select('worker_id, inquiry:inquiries(user_id)')
    .eq('id', offerId)
    .single()

  const isWorker = offer?.worker_id === userId
  const isInquiryOwner = offer?.inquiry?.user_id === userId

  return isWorker || isInquiryOwner || action === 'read'
    ? { allowed: true }
    : {
        allowed: false,
        reason: 'Not authorized for this offer',
        code: 403,
      }
}

async function checkEscrowPermission(
  userId: string,
  action: Action,
  escrowId: string | undefined,
  supabase: any
): Promise<PermissionResult> {
  if (!escrowId) {
    return {
      allowed: false,
      reason: 'Escrow ID required for this action',
      code: 400,
    }
  }

  const { data: escrow } = await supabase
    .from('escrows')
    .select('customer_id, worker_id')
    .eq('id', escrowId)
    .single()

  const isParty = escrow?.customer_id === userId || escrow?.worker_id === userId

  return isParty || action === 'read'
    ? { allowed: true }
    : {
        allowed: false,
        reason: 'Not party to this escrow',
        code: 403,
      }
}
