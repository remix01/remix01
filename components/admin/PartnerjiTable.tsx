'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Edit, Ban, Trash2, Star, Building2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { zavrniPartnerja, suspendiranjPartnerja, reaktivirajPartnerja, deletePartner, updatePartner } from '@/app/admin/actions'
import type { Partner } from '@/types/admin'

interface PartnerjiTableProps {
  partnerji: Partner[]
  currentPage: number
  totalPages: number
}

const SUBSCRIPTION_TIERS = [
  { value: 'start', label: 'START' },
  { value: 'pro', label: 'PRO' },
  { value: 'elite', label: 'ELITE' },
]

export function PartnerjiTable({ partnerji, currentPage, totalPages }: PartnerjiTableProps) {
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; partnerId: string | null }>({
    open: false,
    partnerId: null,
  })
  const [razlog, setRazlog] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<{ open: boolean; partner: Partner | null }>({
    open: false,
    partner: null,
  })
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editTelefon, setEditTelefon] = useState('')
  const [editTier, setEditTier] = useState('start')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  const openEditDialog = (partner: Partner) => {
    setEditBusinessName(partner.podjetje ?? partner.ime)
    setEditTelefon(partner.telefon ?? '')
    setEditTier('start')
    setEditError(null)
    setEditSuccess(false)
    setEditDialog({ open: true, partner })
  }

  const handleEditSave = async () => {
    if (!editDialog.partner) return
    setEditSaving(true)
    setEditError(null)
    setEditSuccess(false)
    try {
      const result = await updatePartner(editDialog.partner.id, {
        business_name: editBusinessName,
        telefon: editTelefon,
        subscription_tier: editTier,
      })
      if (!result.success) { setEditError(result.error ?? 'Napaka pri shranjevanju'); return }
      setEditSuccess(true)
      setTimeout(() => { setEditDialog({ open: false, partner: null }); window.location.reload() }, 800)
    } catch { setEditError('Napaka pri shranjevanju.') } finally { setEditSaving(false) }
  }

  const handleReject = async () => {
    if (!rejectDialog.partnerId || razlog.trim().length < 3) return
    setActionError(null)
    try {
      const result = await zavrniPartnerja(rejectDialog.partnerId, razlog)
      if (!result.success) { setActionError(result.error || 'Napaka pri zavrnitvi.'); return }
      setRejectDialog({ open: false, partnerId: null })
      setRazlog('')
      window.location.reload()
    } catch { setActionError('Napaka pri zavrnitvi.') }
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Ocena</TableHead>
              <TableHead>Naročil</TableHead>
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
                    <Button variant="ghost" size="icon" asChild title="Pregled">
                      <Link href={`/admin/partnerji/${partner.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Uredi"
                      onClick={() => openEditDialog(partner)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={partner.status === 'SUSPENDIRAN' ? 'Reaktiviraj' : 'Suspendiraj'}
                      onClick={async () => {
                        setActionError(null)
                        try {
                          if (partner.status === 'SUSPENDIRAN') {
                            const result = await reaktivirajPartnerja(partner.id)
                            if (!result.success) { setActionError(result.error || 'Napaka pri reaktivaciji.'); return }
                          } else {
                            await suspendiranjPartnerja(partner.id)
                          }
                          window.location.reload()
                        } catch { setActionError('Napaka.') }
                      }}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Izbriši"
                      onClick={() => {
                        if (confirm(`Ali res želite izbrisati partnerja "${partner.ime}"?`)) {
                          deletePartner(partner.id).then(() => window.location.reload())
                        }
                      }}
                    >
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
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { setRejectDialog({ open, partnerId: null }); setActionError(null) }}>
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
            {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog({ open: false, partnerId: null })
              setRazlog('')
              setActionError(null)
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => { if (!open) setEditDialog({ open: false, partner: null }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi partnerja</DialogTitle>
            <DialogDescription>
              Spremenite podatke partnerja {editDialog.partner?.ime}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-business-name">Ime podjetja</Label>
              <Input
                id="edit-business-name"
                value={editBusinessName}
                onChange={(e) => setEditBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-telefon">Telefon</Label>
              <Input
                id="edit-telefon"
                type="tel"
                value={editTelefon}
                onChange={(e) => setEditTelefon(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-tier">Paket</Label>
              <select
                id="edit-tier"
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SUBSCRIPTION_TIERS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
            {editSuccess && <p className="text-xs text-green-600">Shranjeno.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, partner: null })}>
              Prekliči
            </Button>
            <Button disabled={editSaving} onClick={handleEditSave} className="gap-2">
              <Save className="h-4 w-4" />
              {editSaving ? 'Shranjujem...' : 'Shrani'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
