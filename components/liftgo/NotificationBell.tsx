'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

interface NotificationBellProps {
  userId?: string | null
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // CRITICAL: Only run browser code after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !userId) return

    // Only load Supabase after component is mounted on client
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('read', false)

        if (!cancelled && data) {
          setUnreadCount(data.length)
        }
      } catch (err) {
        // Silent fail — notifications are not critical
        console.error('[NotificationBell] Error:', err)
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
    }
  }, [mounted, userId])

  // Don't render anything until mounted on client
  // This prevents ALL hydration mismatches
  if (!mounted) return null
  if (!userId) return null

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <Bell size={20} />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          background: 'red',
          color: 'white',
          borderRadius: '50%',
          width: 16,
          height: 16,
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}
