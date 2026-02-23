import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push-notifications'

export type NotificationType = 
  | 'nova_ponudba'        // narocnik: obrtnik sent offer
  | 'ponudba_sprejeta'    // obrtnik: his offer was accepted
  | 'ponudba_zavrnjena'   // obrtnik: his offer was rejected
  | 'nova_ocena'          // obrtnik: received new review
  | 'termin_potrjen'      // both: appointment confirmed
  | 'termin_opomnik'      // both: appointment reminder
  | 'placilo_prejeto'     // obrtnik: payment received
  | 'placilo_zahtevano'   // narocnik: payment requested

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Send a notification to a user
 */
export async function sendNotification(params: {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        metadata: params.metadata || {},
      })

    if (error) {
      console.error('[v0] Error sending notification:', error)
      return { success: false, error: error.message }
    }

    // Also send push notification for critical notification types
    const pushNotificationTypes: NotificationType[] = [
      'nova_ponudba',
      'ponudba_sprejeta',
      'nova_ocena',
      'termin_opomnik'
    ]

    if (pushNotificationTypes.includes(params.type)) {
      try {
        await sendPushToUser({
          userId: params.userId,
          title: params.title,
          message: params.message,
          link: params.link
        })
      } catch (pushError) {
        // Don't fail the main notification if push fails
        console.error('[v0] Error sending push notification:', pushError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in sendNotification:', error)
    return { success: false, error: 'Unexpected error' }
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('[v0] Error marking notification as read:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in markAsRead:', error)
    return { success: false }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  userId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('[v0] Error marking all as read:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in markAllAsRead:', error)
    return { success: false }
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  userId: string
): Promise<number> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('[v0] Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[v0] Error in getUnreadCount:', error)
    return 0
  }
}

/**
 * Get recent notifications for a user
 */
export async function getRecentNotifications(
  userId: string,
  limit: number = 20
): Promise<Notification[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[v0] Error fetching notifications:', error)
      return []
    }

    return (data || []) as Notification[]
  } catch (error) {
    console.error('[v0] Error in getRecentNotifications:', error)
    return []
  }
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getAllNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ notifications: Notification[]; total: number }> {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit

    // Get count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get paginated data
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[v0] Error fetching all notifications:', error)
      return { notifications: [], total: 0 }
    }

    return { notifications: (data || []) as Notification[], total: count || 0 }
  } catch (error) {
    console.error('[v0] Error in getAllNotifications:', error)
    return { notifications: [], total: 0 }
  }
}
