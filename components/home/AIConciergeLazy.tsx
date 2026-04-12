'use client'

import dynamic from 'next/dynamic'

export const AIConciergeLazy = dynamic(
  () => import('@/components/home/AIConciergePopup').then((mod) => mod.AIConciergePopup),
  {
    ssr: false,
    loading: () => null,
  }
)
