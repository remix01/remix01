'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/notifications?limit=10')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const result = await response.json()
      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
      }
    } catch (error) {
      console.error('[useNotifications] Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notification as read
  const markRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('[useNotifications] Mark read error:', error)
    }
  }, [])

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
      })
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('[useNotifications] Mark all read error:', error)
    }
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    // Initial fetch
    fetchNotifications()

    // Set up real-time subscription
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !mounted) return

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            
            // Add new notification to the beginning of the list
            setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10))
            setUnreadCount(prev => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            
            // Update notification in the list
            setNotifications(prev =>
              prev.map(n =>
                n.id === payload.new.id ? (payload.new as Notification) : n
              )
            )
            
            // Recalculate unread count
            if ((payload.new as Notification).is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }

    getUser()

    return () => {
      mounted = false
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  }
}
