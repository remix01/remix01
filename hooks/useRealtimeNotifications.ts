'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  resourceId?: string
  read: boolean
  createdAt: string
}

interface DbNotification {
  id: string
  user_id: string
  type: string
  title: string
  message?: string
  body?: string
  resource_id?: string
  is_read?: boolean
  read?: boolean
  created_at: string
}

interface BroadcastPayload {
  schema: string
  table: string
  commit_timestamp: string
  new: DbNotification | null
  old: DbNotification | null
}

function mapNotification(n: DbNotification): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.message ?? n.body ?? '',
    resourceId: n.resource_id,
    read: n.is_read ?? n.read ?? false,
    createdAt: n.created_at,
  }
}

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!userId) return

    const supabase = supabaseRef.current

    // Load existing unread notifications on mount
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('[RT] Error loading notifications:', error)
          return
        }
        if (data) {
          const mapped = (data as DbNotification[]).map(mapNotification)
          setNotifications(mapped)
          setUnreadCount(mapped.length)
        }
      })

    // Subscribe to private broadcast channel
    const topic = `user:${userId}:notifications`

    const channel = supabase
      .channel(topic, {
        config: { private: true },
      })
      .on<BroadcastPayload>('broadcast', { event: 'INSERT' }, ({ payload }) => {
        const n = payload?.new
        if (!n) return
        const notification = mapNotification(n)
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Fire browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (window.Notification.permission === 'granted') {
            new window.Notification(notification.title, {
              body: notification.body,
              icon: '/favicon.ico',
            })
          }
        }
      })
      .on<BroadcastPayload>('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        const n = payload?.new
        if (!n) return
        const updated = mapNotification(n)
        setNotifications(prev =>
          prev.map(existing => existing.id === updated.id ? updated : existing)
        )
        if (updated.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[RT] Notifications channel error:', topic)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabaseRef.current
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('[RT] Error marking notification as read:', error)
        return
      }
      // Optimistic update — broadcast UPDATE will confirm
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('[RT] Error in markAsRead:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return
    try {
      const { error } = await supabaseRef.current
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('[RT] Error marking all notifications as read:', error)
        return
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('[RT] Error in markAllAsRead:', error)
    }
  }

  const requestPermission = async () => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    await window.Notification.requestPermission()
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission }
}
