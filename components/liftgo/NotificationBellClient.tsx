'use client'

import dynamic from 'next/dynamic'

const NotificationBell = dynamic(
  () => import('@/components/liftgo/NotificationBell')
    .then(m => ({ default: m.NotificationBell })),
  {
    ssr: false,
    loading: () => null,
  }
)

export function NotificationBellClient({ userId }: { userId?: string | null }) {
  if (!userId) return null
  return <NotificationBell userId={userId} />
}
