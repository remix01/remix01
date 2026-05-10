'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { updateStranka, deleteStranka } from '@/app/admin/actions'
import type { Stranka } from '@/types/admin'

export function EditStrankaForm({ stranka }: { stranka: Stranka }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [ime, setIme] = useState(stranka.ime)
  const [priimek, setPriimek] = useState(stranka.priimek)
  const [telefon, setTelefon] = useState(stranka.telefon ?? '')
  const [lokacija, setLokacija] = useState(stranka.lokacija ?? '')

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updateStranka(stranka.id, { ime, priimek, telefon, lokacija })
    setSaving(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? 'Napaka pri shranjevanju')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteStranka(stranka.id)
    router.push('/admin/stranke')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uredi podatke</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ime">Ime</Label>
            <Input id="ime" value={ime} onChange={e => setIme(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="priimek">Priimek</Label>
            <Input id="priimek" value={priimek} onChange={e => setPriimek(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" type="tel" value={telefon} onChange={e => setTelefon(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lokacija">Mesto</Label>
            <Input id="lokacija" value={lokacija} onChange={e => setLokacija(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Shranjeno.</p>}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Shranjujem...' : 'Shrani'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting} className="gap-2">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Brišem...' : 'Izbriši stranko'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Izbriši stranko</AlertDialogTitle>
                <AlertDialogDescription>
                  Ali ste prepričani? To dejanje je trajno in ga ni mogoče razveljaviti.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Izbriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
