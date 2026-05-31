'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Edit, Ban, Trash2, Users, Download, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { exportStrankeCSV, bulkSuspendStranke, bulkDeleteStranke, deleteStranka, updateStrankaStatus, updateStranka } from '@/app/admin/actions'
import type { Stranka } from '@/types/admin'

interface StrankeTableProps {
  stranke: Stranka[]
  currentPage: number
  totalPages: number
  searchTerm?: string
}

export function StrankeTable({ stranke, currentPage, totalPages, searchTerm = '' }: StrankeTableProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; stranka: Stranka | null }>({
    open: false,
    stranka: null,
  })
  const [editIme, setEditIme] = useState('')
  const [editPriimek, setEditPriimek] = useState('')
  const [editTelefon, setEditTelefon] = useState('')
  const [editLokacija, setEditLokacija] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  const openEditDialog = (stranka: Stranka) => {
    setEditIme(stranka.ime)
    setEditPriimek(stranka.priimek)
    setEditTelefon(stranka.telefon ?? '')
    setEditLokacija(stranka.lokacija ?? '')
    setEditError(null)
    setEditSuccess(false)
    setEditDialog({ open: true, stranka })
  }

  const handleEditSave = async () => {
    if (!editDialog.stranka) return
    setEditSaving(true)
    setEditError(null)
    setEditSuccess(false)
    try {
      const result = await updateStranka(editDialog.stranka.id, {
        ime: editIme,
        priimek: editPriimek,
        telefon: editTelefon,
        lokacija: editLokacija,
      })
      if (!result.success) { setEditError(result.error ?? 'Napaka pri shranjevanju'); return }
      setEditSuccess(true)
      setTimeout(() => { setEditDialog({ open: false, stranka: null }); window.location.reload() }, 800)
    } catch { setEditError('Napaka pri shranjevanju.') } finally { setEditSaving(false) }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(stranke.map(s => s.id))
    } else {
      setSelected([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelected(prev => [...prev, id])
    } else {
      setSelected(prev => prev.filter(sid => sid !== id))
    }
  }

  const handleBulkSuspend = async () => {
    await bulkSuspendStranke(selected)
    setSelected([])
    window.location.reload()
  }

  const handleBulkDelete = async () => {
    await bulkDeleteStranke(selected)
    setSelected([])
    window.location.reload()
  }

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteStranka(deleteTarget.id)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      window.location.reload()
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const csv = await exportStrankeCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stranke-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  if (stranke.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Ni strank</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {searchTerm ? `Ni rezultatov za "${searchTerm}"` : 'Še ni registriranih strank'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button onClick={handleExportCSV} disabled={isExporting} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Izvozi CSV
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selected.length === stranke.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Ime</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Datum registracije</TableHead>
              <TableHead>Naročil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stranke.map((stranka) => (
              <TableRow key={stranka.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(stranka.id)}
                    onCheckedChange={(checked) => handleSelectRow(stranka.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {stranka.ime} {stranka.priimek}
                </TableCell>
                <TableCell>{stranka.email}</TableCell>
                <TableCell>{stranka.telefon || '-'}</TableCell>
                <TableCell>
                  {new Date(stranka.createdAt).toLocaleDateString('sl-SI')}
                </TableCell>
                <TableCell>{stranka.narocil}</TableCell>
                <TableCell>
                  <StatusBadge status={stranka.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild title="Pregled">
                      <Link href={`/admin/stranke/${stranka.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Uredi"
                      onClick={() => openEditDialog(stranka)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={stranka.status === 'SUSPENDIRAN' ? 'Aktiviraj' : 'Suspendiraj'}
                      onClick={async () => {
                        const newStatus = stranka.status === 'SUSPENDIRAN' ? 'AKTIVEN' : 'SUSPENDIRAN'
                        await updateStrankaStatus(stranka.id, newStatus)
                        window.location.reload()
                      }}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Izbriši"
                      onClick={() => {
                        setDeleteTarget({ id: stranka.id, name: `${stranka.ime} ${stranka.priimek}` })
                        setDeleteDialogOpen(true)
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

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selected.length} izbrano</span>
            <div className="h-4 w-px bg-border" />
            <Button size="sm" variant="outline" onClick={handleBulkSuspend}>
              Suspendiraj izbrane ({selected.length})
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              Izbriši izbrane ({selected.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Prekliči
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdite brisanje</AlertDialogTitle>
            <AlertDialogDescription>
              Stranka <strong>{deleteTarget?.name}</strong> bo trajno izbrisana. Te akcije ni mogoče razveljaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => { if (!open) setEditDialog({ open: false, stranka: null }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi stranko</DialogTitle>
            <DialogDescription>
              Spremenite podatke stranke {editDialog.stranka?.ime} {editDialog.stranka?.priimek}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-ime">Ime</Label>
                <Input id="edit-ime" value={editIme} onChange={(e) => setEditIme(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-priimek">Priimek</Label>
                <Input id="edit-priimek" value={editPriimek} onChange={(e) => setEditPriimek(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-telefon">Telefon</Label>
                <Input id="edit-telefon" type="tel" value={editTelefon} onChange={(e) => setEditTelefon(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-lokacija">Mesto</Label>
                <Input id="edit-lokacija" value={editLokacija} onChange={(e) => setEditLokacija(e.target.value)} />
              </div>
            </div>
            {editError && <p className="text-xs text-destructive">{editError}</p>}
            {editSuccess && <p className="text-xs text-green-600">Shranjeno.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, stranka: null })}>
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
