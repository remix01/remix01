'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminUpdatePonudbaStatus } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MoreHorizontal, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

interface OfferStatusActionProps {
  ponudbaId: string
  currentStatus: string
}

export function OfferStatusAction({ ponudbaId, currentStatus }: OfferStatusActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function handleStatusChange(status: 'poslana' | 'sprejeta' | 'zavrnjena', adminReason?: string) {
    setLoading(true)
    setError(null)
    const result = await adminUpdatePonudbaStatus(ponudbaId, status, adminReason)
    setLoading(false)
    if (result.success) {
      setRejectOpen(false)
      router.refresh()
    } else {
      setError(result.error || 'Napaka')
    }
  }

  return (
    <>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading} className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Moderiraj ponudbo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {currentStatus !== 'sprejeta' && (
            <DropdownMenuItem onClick={() => handleStatusChange('sprejeta')}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Sprejmi
            </DropdownMenuItem>
          )}
          {currentStatus !== 'zavrnjena' && (
            <DropdownMenuItem onClick={() => setRejectOpen(true)}>
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Zavrni
            </DropdownMenuItem>
          )}
          {currentStatus !== 'poslana' && (
            <DropdownMenuItem onClick={() => handleStatusChange('poslana')}>
              <RotateCcw className="mr-2 h-4 w-4 text-blue-600" />
              Ponastavi na poslana
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zavrni ponudbo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Razlog zavrnitve (neobvezno)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Prekliči
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusChange('zavrnjena', reason || undefined)}
              disabled={loading}
            >
              {loading ? 'Zavračam...' : 'Zavrni'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
