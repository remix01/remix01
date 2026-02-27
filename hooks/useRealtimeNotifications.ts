'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: 'offer_received' | 'escrow_captured' | 'escrow_released' | 'dispute_opened' | 'message_received'
  title: string
  body: string
  resourceId?: string
  read: boolean
  createdAt: string
}

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as any
          const notification: Notification = {
            id: newNotif.id,
            type: newNotif.type,
            title: newNotif.title,
            body: newNotif.message || newNotif.body,
            resourceId: newNotif.resource_id,
            read: newNotif.is_read || newNotif.read || false,
            createdAt: newNotif.created_at,
          }
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: '/icon.png',
            })
          }
        }
      )
      .subscribe()

    // Load existing unread notifications on mount
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.message || n.body,
            resourceId: n.resource_id,
            read: n.is_read || n.read || false,
            createdAt: n.created_at,
          }))
          setNotifications(mapped)
          setUnreadCount(mapped.length)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const requestPermission = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission }
}
