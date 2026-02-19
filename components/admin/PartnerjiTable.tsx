'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Edit, Ban, Trash2, Star, Building2, Clock } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from './StatusBadge'
import { PendingPartnerCard } from './PendingPartnerCard'
import { zavrniPartnerja } from '@/app/admin/actions'
import type { Partner } from '@/types/admin'

interface PartnerjiTableProps {
  partnerji: Partner[]
  currentPage: number
  totalPages: number
}

export function PartnerjiTable({ partnerji, currentPage, totalPages }: PartnerjiTableProps) {
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; partnerId: string | null }>({
    open: false,
    partnerId: null,
  })
  const [razlog, setRazlog] = useState('')

  const pendingPartnerji = partnerji.filter(p => p.status === 'PENDING')
  const activepartnerji = partnerji.filter(p => p.status !== 'PENDING')

  const handleReject = async () => {
    if (rejectDialog.partnerId && razlog.trim().length >= 3) {
      await zavrniPartnerja(rejectDialog.partnerId, razlog)
      setRejectDialog({ open: false, partnerId: null })
      setRazlog('')
      window.location.reload()
    }
  }

  if (partnerji.length === 0) {
    return (
      <div className="py-16 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Ni partnerjev</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Še ni registriranih partnerjev
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pending Partners Section */}
      {pendingPartnerji.length > 0 && (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 rounded-xl">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Čakajo odobritev ({pendingPartnerji.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pendingPartnerji.map(p => (
              <PendingPartnerCard key={p.id} partner={p} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Ocena</TableHead>
              <TableHead>Prevozov</TableHead>
              <TableHead>Datum registracije</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partnerji.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.ime}</TableCell>
                <TableCell>{partner.email}</TableCell>
                <TableCell>{partner.telefon || '-'}</TableCell>
                <TableCell>{partner.tip}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star 
                        key={i} 
                        className={`h-3.5 w-3.5 ${
                          i <= Math.round(partner.ocena) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-200'
                        }`} 
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{partner.ocena.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>{partner.steviloPrevozov}</TableCell>
                <TableCell>
                  {new Date(partner.createdAt).toLocaleDateString('sl-SI')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={partner.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/partnerji/${partner.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Stran {currentPage} od {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('page', String(currentPage - 1))
                window.location.href = url.toString()
              }}
            >
              Prejšnja
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('page', String(currentPage + 1))
                window.location.href = url.toString()
              }}
            >
              Naslednja
            </Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, partnerId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zavrni partnerja</DialogTitle>
            <DialogDescription>
              Navedi razlog za zavrnitev partnerja. Partner bo suspendiran.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Vnesite razlog..."
              value={razlog}
              onChange={(e) => setRazlog(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Navedi razlog za zavrnitev (vsaj 3 znaki)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog({ open: false, partnerId: null })
              setRazlog('')
            }}>
              Prekliči
            </Button>
            <Button
              variant="destructive"
              disabled={razlog.trim().length < 3}
              onClick={handleReject}
            >
              Zavrni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
