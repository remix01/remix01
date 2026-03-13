'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Don't show if user dismissed before
    if (typeof window !== 'undefined' && localStorage.getItem('pwa-dismissed') === '1') {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
      localStorage.setItem('pwa-installed', '1')
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F3460] text-white px-4 py-3 flex items-center justify-between shadow-lg md:rounded-t-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📱</span>
        <div>
          <p className="font-semibold text-sm">Namestite LiftGO</p>
          <p className="text-xs text-blue-100">Hitrejši dostop do mojstrov in ponudb</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-4 py-1.5 border border-white rounded-lg text-sm font-semibold hover:bg-white hover:text-[#0F3460] transition-colors whitespace-nowrap"
        >
          Namesti
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          aria-label="Zapri"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
