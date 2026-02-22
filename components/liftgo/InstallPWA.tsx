'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa_dismissed')
    if (dismissed === 'true') {
      return
    }

    // Check if mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('[v0] PWA install outcome:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[v0] User accepted PWA install')
      } else {
        console.log('[v0] User dismissed PWA install')
      }

      setDeferredPrompt(null)
      setShowBanner(false)
    } catch (error) {
      console.error('[v0] Error installing PWA:', error)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', 'true')
    setShowBanner(false)
  }

  // Only show on mobile and if banner should be shown
  if (!isMobile || !showBanner || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 mb-4 md:hidden">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📱</span>
              <h3 className="font-semibold text-gray-900">
                Namesti aplikacijo LiftGO
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Hitrejši dostop, deluje brez interneta
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleInstall}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Namesti
              </Button>
              <Button 
                onClick={handleDismiss}
                size="sm"
                variant="outline"
              >
                Ne zdaj
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Zapri"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
