'use client'
import { useOfflineSync } from '@/hooks/useOfflineSync'

export function OfflineBanner() {
  const { isOnline, pendingCount, syncMessage } = useOfflineSync()
  if (isOnline && !pendingCount && !syncMessage) return null

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
          📡 Brez povezave
          {pendingCount > 0 && ` — ${pendingCount} povpraševanje v čakanju`}
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium animate-pulse">
          🔄 Pošiljam shranjeno povpraševanje...
        </div>
      )}
      {syncMessage && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white text-center py-2 px-4 text-sm font-medium">
          ✅ {syncMessage}
        </div>
      )}
    </>
  )
}
