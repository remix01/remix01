'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShieldAlert, Ban, CheckCircle } from 'lucide-react'

interface SuspensionPanelProps {
  userId: string
  isSuspended: boolean
  suspendedReason?: string | null
}

export function SuspensionPanel({ userId, isSuspended, suspendedReason }: SuspensionPanelProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSuspend = async () => {
    if (!reason.trim()) {
      alert('Prosim vnesite razlog za suspenzijo')
      return
    }

    setLoading(true)
    try {
      await fetch(`/api/admin/craftworkers/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      window.location.reload()
    } catch (error) {
      console.error('[v0] Failed to suspend:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsuspend = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/craftworkers/${userId}/unsuspend`, { method: 'POST' })
      window.location.reload()
    } catch (error) {
      console.error('[v0] Failed to unsuspend:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ShieldAlert className="h-5 w-5" />
        Suspenzija računa
      </h3>

      {isSuspended ? (
        <>
          <Badge variant="destructive" className="text-sm">
            <Ban className="h-3 w-3 mr-1" />
            Suspendiran
          </Badge>
          {suspendedReason && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm">
              <span className="font-medium">Razlog:</span> {suspendedReason}
            </div>
          )}
          <Button
            onClick={handleUnsuspend}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading ? 'Obdelava...' : 'Reaktiviraj račun'}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Suspenzija bo onemogočila dostop do platforme in zapre vse odprte pogovore.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Razlog za suspenzijo..."
            rows={3}
          />
          <Button
            onClick={handleSuspend}
            disabled={loading || !reason.trim()}
            variant="destructive"
            className="w-full"
          >
            <Ban className="h-4 w-4 mr-2" />
            {loading ? 'Obdelava...' : 'Suspendiraj račun'}
          </Button>
        </>
      )}
    </div>
  )
}
