'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface ListSyncToolbarProps {
  className?: string
}

export function ListSyncToolbar({ className }: ListSyncToolbarProps) {
  const router = useRouter()
  const { isOnline, pendingCount, syncMessage } = useOfflineSync()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className={className ?? 'mb-4'}>
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-600" />
              <span className="text-foreground">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-amber-600" />
              <span className="text-foreground">Offline način</span>
            </>
          )}
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              Čaka sinhronizacija: {pendingCount}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="min-h-[40px] gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Osvežujem...' : 'Osveži'}
        </Button>
      </div>

      {syncMessage && (
        <p className="mt-2 text-xs text-emerald-700">{syncMessage}</p>
      )}
    </div>
  )
}
