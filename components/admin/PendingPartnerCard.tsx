'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { odobriPartnerja, zavrniPartnerja } from '@/app/admin/actions'
import type { Partner } from '@/types/admin'

interface PendingPartnerCardProps {
  key?: React.Key
  partner: Partner
}

export function PendingPartnerCard({ partner }: PendingPartnerCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [razlog, setRazlog] = useState('')

  const handleApprove = async () => {
    setLoading(true)
    try {
      await odobriPartnerja(partner.id)
      router.refresh()
    } catch (error) {
      console.error('Napaka pri odobritvi:', error)
      setLoading(false)
    }
  }

  const handleRejectConfirmed = async () => {
    if (!razlog.trim()) return
    setLoading(true)
    try {
      await zavrniPartnerja(partner.id, razlog)
      setRejectDialogOpen(false)
      setRazlog('')
      router.refresh()
    } catch (error) {
      console.error('Napaka pri zavrnitvi:', error)
      setLoading(false)
    }
  }

  return (
    <>
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
                onClick={() => setRejectDialogOpen(true)}
                disabled={loading}
              >
                <X className="h-4 w-4" />
                Zavrni
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zavrni partnerja</DialogTitle>
            <DialogDescription>
              Navedite razlog za zavrnitev partnerja <strong>{partner.ime}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Vnesite razlog zavrnitve..."
            value={razlog}
            onChange={(e) => setRazlog(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRazlog('') }}>
              Prekliči
            </Button>
            <Button
              variant="destructive"
              disabled={!razlog.trim() || loading}
              onClick={handleRejectConfirmed}
            >
              Zavrni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
