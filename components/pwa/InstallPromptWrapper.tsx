'use client'

import dynamic from 'next/dynamic'

const InstallPrompt = dynamic(
  () => import('@/components/pwa/InstallPrompt').then(m => m.InstallPrompt),
  { ssr: false }
)

export function InstallPromptWrapper() {
  return <InstallPrompt />
}
