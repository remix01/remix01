import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendWebPushToUser } from '@/lib/push/web-subscription-service'

export type NotificationType =
  | 'nova_ponudba'
  | 'ponudba_sprejeta'
  | 'ponudba_zavrnjena'
  | 'nova_ocena'
  | 'termin_potrjen'
  | 'termin_opomnik'
  | 'placilo_prejeto'
  | 'placilo_zahtevano'
  | 'povprasevanje_oddano'
  | 'ponudba_umaknjena'
  | 'izbira_ponudbe_reminder'
  | 'novo_sporocilo'
  | 'novo_povprasevanje'
  | 'rok_izteka'
  | 'lead_escalation'
  | 'lead_no_match'
  | 'lead_unassigned'
  | 'NEW_REQUEST_MATCHED'
  | 'RESPONSE_DEADLINE_90MIN'
  | 'RESPONSE_DEADLINE_BREACH'
  | 'OFFER_ACCEPTED'
  | 'NEW_REVIEW_RECEIVED'
  | 'SUBSCRIPTION_EXPIRING_7D'
  | 'profil_verificiran'

export interface NotificationPayload {
  userId: string | null
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

const PUSH_NOTIFICATION_TYPES: NotificationType[] = [
  'nova_ponudba',
  'ponudba_sprejeta',
  'nova_ocena',
  'termin_opomnik',
  'lead_escalation',
  'profil_verificiran',
]

// Returns both new canonical columns and legacy aliases so old rows and new rows
// are queryable regardless of which migration version the DB is on.
// Return type is `any` because we intentionally write legacy compat columns
// (link, metadata) that are not in the generated Supabase Insert type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInsertRow(p: NotificationPayload): any {
  return {
    user_id: p.userId,
    type: p.type,
    title: p.title,
    // canonical new columns
    body: p.message,
    action_url: p.link ?? null,
    data: p.metadata ?? null,
    read: false,
    // legacy column aliases preserved for backward compat
    message: p.message,
    link: p.link ?? null,
    metadata: p.metadata ?? null,
  }
}

/**
 * Send a notification to a user (or admin alert when userId is null).
 */
export async function sendNotification(
  params: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert(buildInsertRow(params))

    if (error) {
      console.error('[notifications] insert error:', error)
      return { success: false, error: error.message }
    }

    if (params.userId && PUSH_NOTIFICATION_TYPES.includes(params.type)) {
      sendWebPushToUser({
        userId: params.userId,
        title: params.title,
        body: params.message,
        data: params.link ? { url: params.link } : undefined,
      }).catch((e) => console.error('[notifications] web push error:', e))
    }

    return { success: true }
  } catch (error) {
    console.error('[notifications] sendNotification error:', error)
    return { success: false, error: 'Unexpected error' }
  }
}

/**
 * Send notifications to multiple users in a single batch insert.
 */
export async function sendNotificationBatch(
  items: NotificationPayload[]
): Promise<{ success: boolean; error?: string }> {
  if (items.length === 0) return { success: true }

  try {
    const rows = items.map(buildInsertRow)
    const { error } = await supabaseAdmin.from('notifications').insert(rows)

    if (error) {
      console.error('[notifications] batch insert error:', error)
      return { success: false, error: error.message }
    }

    for (const p of items) {
      if (p.userId && PUSH_NOTIFICATION_TYPES.includes(p.type)) {
        sendWebPushToUser({
          userId: p.userId,
          title: p.title,
          body: p.message,
          data: p.link ? { url: p.link } : undefined,
        }).catch((e) => console.error('[notifications] web push error:', e))
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[notifications] sendNotificationBatch error:', error)
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
      .update({ read: true })
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
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

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
      .eq('read', false)

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

    return (data || []).map((n: any) => ({
      id: n.id,
      user_id: n.user_id || '',
      type: n.type,
      title: n.title || '',
      message: n.message || n.body || '',
      link: n.action_url || n.link || undefined,
      read: !!(n.read ?? n.is_read),
      metadata: (n.data as Record<string, unknown>) || {},
      created_at: n.created_at || new Date().toISOString(),
    })) as Notification[]
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

    return { notifications: (data || []).map((n: any) => ({
      id: n.id,
      user_id: n.user_id || '',
      type: n.type,
      title: n.title || '',
      message: n.message || n.body || '',
      link: n.action_url || n.link || undefined,
      read: !!(n.read ?? n.is_read),
      metadata: (n.data as Record<string, unknown>) || {},
      created_at: n.created_at || new Date().toISOString(),
    })) as Notification[], total: count || 0 }
  } catch (error) {
    console.error('[v0] Error in getAllNotifications:', error)
    return { notifications: [], total: 0 }
  }
}
