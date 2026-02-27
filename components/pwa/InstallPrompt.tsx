'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showAfterDelay, setShowAfterDelay] = useState(false)

  useEffect(() => {
    try {
      // Check if mobile
      const checkMobile = () => {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
        setIsMobile(isMobileDevice)
      }

      checkMobile()
      window.addEventListener('resize', checkMobile)

      // Check if already dismissed this session
      const isDismissed = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pwa-install-dismissed') : null
      let timer: NodeJS.Timeout | undefined
      
      if (!isDismissed) {
        // Show prompt after 30 seconds on first visit
        timer = setTimeout(() => {
          setShowAfterDelay(true)
        }, 30000)
      }

      return () => {
        window.removeEventListener('resize', checkMobile)
        if (timer) clearTimeout(timer)
      }
    } catch (error) {
      console.error('[v0] Error in InstallPrompt setup:', error)
      return () => {}
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)

      // Only show if on mobile and time has passed
      if (isMobile && showAfterDelay && !isVisible) {
        setIsVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isMobile, showAfterDelay, isVisible])

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        // User accepted the install prompt
        setIsVisible(false)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('pwa-install-dismissed', 'true')
        }
      }
    } catch (error) {
      console.error('[v0] Install prompt error:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true')
    }
  }

  if (!isVisible || !isMobile) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg rounded-t-lg animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Download className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Dodajte LiftGO na začetni zaslon
            </p>
            <p className="text-xs text-muted-foreground">
              Dostop brez interneta in hitrejši dostop
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            className="w-20"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            className="w-24"
          >
            Namesti
          </Button>
        </div>
      </div>
    </div>
  )
}
