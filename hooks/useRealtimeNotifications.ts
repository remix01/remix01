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

    try {
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
            try {
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
              // Guard: only access browser APIs inside callback/useEffect
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (window.Notification.permission === 'granted') {
                  new window.Notification(notification.title, {
                    body: notification.body,
                    icon: '/favicon.ico',
                  })
                }
              }
            } catch (error) {
              console.error('[v0] Error processing notification:', error)
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
        .then(({ data, error }) => {
          if (error) {
            console.error('[v0] Error loading notifications:', error)
            return
          }
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
        .catch((error) => {
          console.error('[v0] Error in notification query:', error)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('[v0] Error initializing notifications:', error)
      // Return empty cleanup function if setup fails
      return () => {}
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('[v0] Error marking notification as read:', error)
        return
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('[v0] Error in markAsRead:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('[v0] Error marking all notifications as read:', error)
        return
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('[v0] Error in markAllAsRead:', error)
    }
  }

  const requestPermission = async () => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    await window.Notification.requestPermission()
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission }
}
