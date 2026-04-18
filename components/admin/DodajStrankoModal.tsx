'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { dodajStranko } from '@/app/admin/actions'

export function DodajStrankoModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ime: '', priimek: '', email: '', telefon: '', lokacija: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.ime) return
    setLoading(true)
    setError(null)
    try {
      const result = await dodajStranko({
        email: form.email,
        ime: form.ime,
        priimek: form.priimek,
        telefon: form.telefon || undefined,
        lokacija: form.lokacija || undefined,
      })
      if (result.success) {
        setOpen(false)
        setForm({ ime: '', priimek: '', email: '', telefon: '', lokacija: '' })
        router.refresh()
      } else {
        setError(result.error || 'Napaka pri dodajanju')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Dodaj stranko
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj novo stranko</DialogTitle>
          <DialogDescription>
            Stranka bo dodana v sistem. Prejela bo e-mail za nastavitev gesla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ime">Ime *</Label>
              <Input
                id="ime"
                placeholder="Janez"
                value={form.ime}
                onChange={e => setForm(f => ({ ...f, ime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priimek">Priimek</Label>
              <Input
                id="priimek"
                placeholder="Novak"
                value={form.priimek}
                onChange={e => setForm(f => ({ ...f, priimek: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="janez@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              type="tel"
              placeholder="+386 41 123 456"
              value={form.telefon}
              onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lokacija">Mesto</Label>
            <Input
              id="lokacija"
              placeholder="Ljubljana"
              value={form.lokacija}
              onChange={e => setForm(f => ({ ...f, lokacija: e.target.value }))}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Prekliči
            </Button>
            <Button type="submit" disabled={loading || !form.email || !form.ime}>
              {loading ? 'Dodajam...' : 'Dodaj stranko'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
