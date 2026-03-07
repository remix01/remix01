'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSyncQueueCount, processSyncQueue } from '@/lib/pwa/db'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const processPendingQueue = useCallback(async () => {
    try {
      const count = await getSyncQueueCount()
      setPendingCount(count)
      
      if (count > 0) {
        await processSyncQueue()
        const newCount = await getSyncQueueCount()
        setPendingCount(newCount)
        
        if (newCount === 0) {
          setSyncMessage('Vsa povpraševanja so bila uspešno poslana!')
          setTimeout(() => setSyncMessage(null), 3000)
        }
      }
    } catch (error) {
      console.error('[v0] Error processing sync queue:', error)
    }
  }, [])

  const handleOnline = async () => {
    setIsOnline(true)
    
    // Manual sync for iOS Safari (no Background Sync API support)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    if (isSafari || isIOS) {
      // Process IndexedDB queue manually on reconnect
      await processSyncQueue()
      const count = await getSyncQueueCount()
      setPendingCount(count)
      if (count === 0 && pendingCount > 0) {
        setSyncMessage('Vsa povpraševanja so bila uspešno poslana!')
        setTimeout(() => setSyncMessage(null), 3000)
      }
    }
  }

  const handleOffline = () => {
    setIsOnline(false)
  }

  useEffect(() => {
    // Check initial state
    setIsOnline(navigator.onLine)
    processPendingQueue()

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [processPendingQueue, pendingCount])

  return {
    isOnline,
    pendingCount,
    syncMessage,
  }
}
