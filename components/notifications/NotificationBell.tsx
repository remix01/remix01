'use client'

import { Bell } from 'lucide-react'

interface NotificationBellProps {
  userId: string | null
}

export function NotificationBell({ userId }: NotificationBellProps) {
  // Only render bell if user is authenticated
  if (!userId) {
    return null
  }

  return (
    <button
      className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
      title="Obvestila"
    >
      <Bell className="w-5 h-5" />
    </button>
  )
}
