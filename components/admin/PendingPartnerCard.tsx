'use client'

import type React from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { odobriPartnerja, zavrniPartnerja } from '@/app/admin/actions'
import { useState } from 'react'
import type { Partner } from '@/types/admin'

interface PendingPartnerCardProps {
  key?: React.Key
  partner: Partner
}

export function PendingPartnerCard({ partner }: PendingPartnerCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setLoading(true)
    setError(null)
    const result = await odobriPartnerja(partner.id)
    if (result.success) {
      window.location.reload()
    } else {
      setError(result.error || 'Napaka pri odobritvi.')
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const razlog = prompt('Vnesite razlog zavrnitve:')
    if (!razlog) return

    setLoading(true)
    setError(null)
    const result = await zavrniPartnerja(partner.id, razlog)
    if (result.success) {
      window.location.reload()
    } else {
      setError(result.error || 'Napaka pri zavrnitvi.')
      setLoading(false)
    }
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <p className="font-semibold">{partner.ime}</p>
            <p className="text-sm text-muted-foreground">{partner.email}</p>
            <p className="text-xs text-muted-foreground">{partner.telefon}</p>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground">
              Registriran:{' '}
              <span className="text-foreground">
                {new Date(partner.createdAt).toLocaleDateString('sl-SI')}
              </span>
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-2"
              onClick={handleApprove}
              disabled={loading}
            >
              <Check className="h-4 w-4" />
              Odobri
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleReject}
              disabled={loading}
            >
              <X className="h-4 w-4" />
              Zavrni
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
