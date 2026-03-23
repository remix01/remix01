/**
 * Notification Service - Extracted from notification routes
 * Handles notification operations
 */

import { createClient } from '@/lib/supabase/server'
import { NotificationService as NotificationServiceImpl } from '@/lib/notifications/notification-service'
import { ServiceError } from './serviceError'

export const notificationService = {
  /**
   * List notifications for a user
   * Business logic extracted from GET /api/v1/notifications
   */
  async listNotifications(
    userId: string,
    options?: {
      page?: number
      limit?: number
    }
  ) {
    const page = options?.page || 1
    const limit = Math.min(options?.limit || 20, 100) // Max 100

    try {
      const result = await NotificationServiceImpl.list(userId, page, limit)

      return {
        notifications: result.notifications,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        unreadCount: result.unreadCount,
      }
    } catch (error) {
      throw new ServiceError(
        'Napaka pri pridobivanju obvestil',
        'DB_ERROR',
        500
      )
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return true
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return true
  },
}
