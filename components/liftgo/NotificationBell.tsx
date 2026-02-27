'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markAsRead, markAllAsRead } from '@/lib/notifications'
import type { Notification } from '@/lib/notifications'
import Link from 'next/link'

interface NotificationBellProps {
  userId: string
}

const notificationColors: Record<string, string> = {
  nova_ponudba: 'bg-blue-500',
  ponudba_sprejeta: 'bg-green-500',
  ponudba_zavrnjena: 'bg-red-500',
  nova_ocena: 'bg-yellow-500',
  termin_potrjen: 'bg-purple-500',
  termin_opomnik: 'bg-orange-500',
  placilo_prejeto: 'bg-green-600',
  placilo_zahtevano: 'bg-blue-600',
}

export function NotificationBell({ userId }: NotificationBellProps) {
  // Guard: if no user, render nothing — no errors, no subscriptions
  if (!userId) {
    return null
  }

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch initial notifications
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!error) {
          setNotifications(data || [])
          const unread = (data || []).filter(n => !n.is_read).length
          setUnreadCount(unread)
        }
      } catch (err) {
        console.error('[v0] Error fetching notifications:', err)
      }
    }

    fetchNotifications()
  }, [userId])

  // Subscribe to Realtime notifications
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    try {
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
              const newNotification = payload.new as Notification
              setNotifications((prev) => [newNotification, ...prev.slice(0, 9)])
              setUnreadCount((prev) => prev + 1)

              // Show browser notification if permitted
              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                try {
                  new window.Notification(newNotification.title, {
                    body: newNotification.message,
                    icon: '/icon.png',
                  })
                } catch (err) {
                  console.error('[v0] Error creating notification:', err)
                }
              }
            } catch (err) {
              console.error('[v0] Error processing notification payload:', err)
            }
          }
        )
        .subscribe()

      // Request notification permission
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
        try {
          window.Notification.requestPermission()
        } catch (err) {
          console.error('[v0] Error requesting notification permission:', err)
        }
      }

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('[v0] Error setting up realtime subscription:', err)
      return () => {}
    }
  }, [userId])

  // Subscribe to read status updates
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    try {
      const channel = supabase
        .channel(`notifications:${userId}:updates`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              const updated = payload.new as Notification
              setNotifications((prev) =>
                prev.map((n) => (n.id === updated.id ? updated : n))
              )
              setUnreadCount((prev) =>
                Math.max(0, prev - (updated.is_read ? 1 : 0))
              )
            } catch (err) {
              console.error('[v0] Error processing update payload:', err)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('[v0] Error setting up update subscription:', err)
      return () => {}
    }
  }, [userId])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId)
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'pravkar'
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours} ur`
    if (diffDays === 1) return 'včeraj'
    return `${diffDays} dni`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-primary transition-colors"
        aria-label="Obvestila"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Obvestila</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Označi vse kot prebrano
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Ni novih obvestil</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link key={notification.id} href={notification.link || '#'}>
                  <div
                    onClick={() => {
                      handleMarkAsRead(notification.id)
                      setIsOpen(false)
                    }}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Colored dot */}
                      <div
                        className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                          notificationColors[notification.type] || 'bg-gray-400'
                        }`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? 'font-normal text-gray-700'
                              : 'font-semibold text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </p>

                        {/* Message */}
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {notification.message}
                        </p>

                        {/* Time ago */}
                        <p className="text-xs text-gray-500 mt-1">
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <Link
                href="/narocnik/obvestila"
                className="text-sm text-primary hover:underline block text-center"
              >
                Prikaži vsa obvestila →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
