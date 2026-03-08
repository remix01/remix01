'use client'

import { useState, useEffect } from 'react'
import { NotificationBell } from '@/components/liftgo/NotificationBell'

export function NotificationBellClient({ userId }: { userId?: string | null }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !userId) return null

  return <NotificationBell userId={userId} />
}
