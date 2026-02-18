import { supabaseAdmin } from '@/lib/supabase-admin'

export type NotificationType = 
  | 'NEW_INQUIRY'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'STATUS_CHANGED'
  | 'PAYMENT_RECEIVED'
  | 'NEW_MESSAGE'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, any>
  is_read: boolean
  created_at: string
}

export class NotificationService {
  /**
   * Create a new notification for a user
   * Uses service role to bypass RLS
   */
  static async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<Notification | null> {
    try {
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          data: data || {},
        })
        .select()
        .single()

      if (error) {
        console.error('[NotificationService] Create error:', error)
        return null
      }

      return notification as Notification
    } catch (error) {
      console.error('[NotificationService] Create exception:', error)
      return null
    }
  }

  /**
   * Mark a notification as read
   */
  static async markRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        console.error('[NotificationService] MarkRead error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[NotificationService] MarkRead exception:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('[NotificationService] MarkAllRead error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[NotificationService] MarkAllRead exception:', error)
      return false
    }
  }

  /**
   * List notifications for a user with pagination
   */
  static async list(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: Notification[]
    total: number
    unreadCount: number
  }> {
    try {
      const offset = (page - 1) * limit

      // Get paginated notifications
      const { data: notifications, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (notifError) {
        console.error('[NotificationService] List error:', notifError)
        return { notifications: [], total: 0, unreadCount: 0 }
      }

      // Get total count
      const { count: total } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get unread count
      const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      return {
        notifications: (notifications || []) as Notification[],
        total: total || 0,
        unreadCount: unreadCount || 0,
      }
    } catch (error) {
      console.error('[NotificationService] List exception:', error)
      return { notifications: [], total: 0, unreadCount: 0 }
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async unreadCount(userId: string): Promise<number> {
    try {
      const { count } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      return count || 0
    } catch (error) {
      console.error('[NotificationService] UnreadCount exception:', error)
      return 0
    }
  }
}

/**
 * PUSH NOTIFICATION INTEGRATION GUIDE
 * 
 * To send push notifications when creating notifications, integrate the push service:
 * 
 * import { TokenService } from '@/lib/push/token-service'
 * import { getPushService } from '@/lib/push/push-service'
 * 
 * // In NotificationService.create() method, after creating the notification:
 * const notification = await supabaseAdmin.from('notifications').insert(...).single()
 * 
 * // Send push notification
 * try {
 *   const tokens = await TokenService.getForUser(userId)
 *   if (tokens.length > 0) {
 *     const pushService = getPushService()
 *     await pushService.send(
 *       tokens.map(t => t.token),
 *       { title, body, data }
 *     )
 *   }
 * } catch (error) {
 *   console.error('[NotificationService] Push send failed:', error)
 *   // Continue even if push fails
 * }
 */
