'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Bell } from 'lucide-react'

interface PushPermissionProps {
  userId: string
}

export function PushPermission({ userId }: PushPermissionProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Check if push permission was already asked
    const hasAsked = localStorage.getItem('push_permission_asked')
    if (hasAsked === 'true') {
      return
    }

    // Check if Notification API is supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    // Show banner after 30 seconds (don't interrupt immediately)
    const timer = setTimeout(() => {
      setShowBanner(true)
    }, 30000)

    return () => clearTimeout(timer)
  }, [])

  const handleAllow = async () => {
    setIsSubscribing(true)

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        })

        // Send subscription to server
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        })

        if (!response.ok) {
          throw new Error('Failed to save subscription')
        }

        console.log('[v0] Push subscription successful')
      }

      // Mark as asked
      localStorage.setItem('push_permission_asked', 'true')
      setShowBanner(false)
    } catch (error) {
      console.error('[v0] Error requesting push permission:', error)
      localStorage.setItem('push_permission_asked', 'true')
      setShowBanner(false)
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDeny = () => {
    localStorage.setItem('push_permission_asked', 'true')
    setShowBanner(false)
  }

  if (!showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Dovolite obvestila?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              Obveščali vas bomo o novih ponudbah in terminih
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAllow}
                disabled={isSubscribing}
                className="flex-1"
              >
                {isSubscribing ? 'Prosim počakajte...' : 'Dovoli'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeny}
                disabled={isSubscribing}
              >
                Ne hvala
              </Button>
            </div>
          </div>

          <button
            onClick={handleDeny}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
