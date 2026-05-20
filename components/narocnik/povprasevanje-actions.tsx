'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { canTransitionPovprasevanje } from '@/lib/state/povprasevanja-status'
import {
  updatePovprasevanjeAction,
  deletePovprasevanjeAction,
  cancelPovprasevanjeAction,
} from '@/app/actions/povprasevanja'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Edit2, Trash2, XCircle } from 'lucide-react'

interface PovprasevanjeActionsProps {
  povprasevanjeId: string
  title: string
  description: string
  status: string
  hasPonudbe: boolean
  hasAcceptedPonudba: boolean
}

export function canCancelPovprasevanje(status: string) {
  if (status === 'v_izvedbi') return false // canonical in-progress
  if (status === 'v_teku') return false // legacy alias for in-progress
  if (status === 'preklicano') return false
  return canTransitionPovprasevanje(status, 'preklicano')
}

export function PovprasevanjeActions({
  povprasevanjeId,
  title,
  description,
  status,
  hasPonudbe,
  hasAcceptedPonudba,
}: PovprasevanjeActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editDescription, setEditDescription] = useState(description)

  const isFinal = ['v_izvedbi', 'v_teku', 'zakljuceno', 'preklicano'].includes(status)
  const canEdit = !isFinal && !hasAcceptedPonudba
  const canDelete = !hasPonudbe && !isFinal
  const canCancel = canCancelPovprasevanje(status)

  async function handleEdit() {
    setLoading(true)
    setError(null)
    const result = await updatePovprasevanjeAction(povprasevanjeId, {
      title: editTitle,
      description: editDescription,
    })
    setLoading(false)
    if (result.success) {
      setSuccess('Povpraševanje posodobljeno')
      setEditOpen(false)
      setTimeout(() => { setSuccess(null); router.refresh() }, 1000)
    } else {
      setError(result.error || 'Napaka')
    }
  }

  async function handleDelete() {
    if (!confirm('Ste prepričani, da želite izbrisati to povpraševanje?')) return
    setLoading(true)
    setError(null)
    const result = await deletePovprasevanjeAction(povprasevanjeId)
    setLoading(false)
    if (result.success) {
      setSuccess('Povpraševanje izbrisano')
      setTimeout(() => router.push('/dashboard'), 1000)
    } else {
      setError(result.error || 'Napaka')
    }
  }

  async function handleCancel() {
    if (!confirm('Ste prepričani, da želite preklicati to povpraševanje?')) return
    setLoading(true)
    setError(null)
    const result = await cancelPovprasevanjeAction(povprasevanjeId)
    setLoading(false)
    if (result.success) {
      setSuccess('Povpraševanje preklicano')
      toast.success('Povpraševanje preklicano')
      setTimeout(() => router.refresh(), 1000)
    } else {
      setError(result.error || 'Napaka')
      toast.error(result.error || 'Napaka pri preklicu povpraševanja')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {error && (
        <div className="w-full rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</div>
      )}
      {success && (
        <div className="w-full rounded-lg bg-green-100 p-3 text-sm text-green-900">{success}</div>
      )}

      {canEdit && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit2 className="h-4 w-4" />
              Uredi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uredi povpraševanje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Naslov</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Opis</Label>
                <Textarea
                  id="edit-desc"
                  rows={5}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Prekliči
              </Button>
              <Button onClick={handleEdit} disabled={loading}>
                {loading ? 'Shranjujem...' : 'Shrani'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
          onClick={handleCancel}
          disabled={loading}
        >
          <XCircle className="h-4 w-4" />
          Prekliči povpraševanje
        </Button>
      )}

      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
          Izbriši
        </Button>
      )}
    </div>
  )
}
