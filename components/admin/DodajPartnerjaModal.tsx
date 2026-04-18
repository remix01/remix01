'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
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
import { dodajPartnerja } from '@/app/admin/actions'

interface CategoryOption {
  id: string
  name: string
}

interface DodajPartnerjaModalProps {
  categories: CategoryOption[]
}

export function DodajPartnerjaModal({ categories }: DodajPartnerjaModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    business_name: '',
    email: '',
    telefon: '',
    ime: '',
    priimek: '',
    lokacija: '',
    category_id: '',
    verifyNow: false,
    subscription_tier: 'start' as 'start' | 'pro' | 'elite',
    payment_confirmed: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.business_name) return
    setLoading(true)
    setError(null)
    try {
      const result = await dodajPartnerja({
        email: form.email,
        business_name: form.business_name,
        ime: form.ime || undefined,
        priimek: form.priimek || undefined,
        telefon: form.telefon || undefined,
        lokacija: form.lokacija || undefined,
        category_id: form.category_id || undefined,
        verifyNow: form.verifyNow,
        subscription_tier: form.subscription_tier,
        payment_confirmed: form.payment_confirmed,
      })
      if (result.success) {
        setOpen(false)
        setForm({
          business_name: '',
          email: '',
          telefon: '',
          ime: '',
          priimek: '',
          lokacija: '',
          category_id: '',
          verifyNow: false,
          subscription_tier: 'start',
          payment_confirmed: false,
        })
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
          <Building2 className="h-4 w-4" />
          Dodaj partnerja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj novega partnerja</DialogTitle>
          <DialogDescription>
            Partner bo dodan kot nepotrjen obrtnik. Prejel bo e-mail za nastavitev gesla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="business_name">Ime podjetja / Obrtnik *</Label>
            <Input
              id="business_name"
              placeholder="Vodovodne storitve Novak"
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="partner@example.com"
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ime">Ime kontaktne osebe</Label>
              <Input
                id="ime"
                placeholder="Miha"
                value={form.ime}
                onChange={e => setForm(f => ({ ...f, ime: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priimek">Priimek kontaktne osebe</Label>
              <Input
                id="priimek"
                placeholder="Novak"
                value={form.priimek}
                onChange={e => setForm(f => ({ ...f, priimek: e.target.value }))}
              />
            </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Primarna kategorija</Label>
            <select
              id="category_id"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Brez kategorije</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.verifyNow}
              onChange={e => setForm(f => ({ ...f, verifyNow: e.target.checked }))}
            />
            Takoj verificiraj in aktiviraj partnerja v katalogu
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="subscription_tier">Paket po potrjenem plačilu</Label>
            <select
              id="subscription_tier"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.subscription_tier}
              onChange={e => setForm(f => ({ ...f, subscription_tier: e.target.value as 'start' | 'pro' | 'elite' }))}
            >
              <option value="start">START</option>
              <option value="pro">PRO</option>
              <option value="elite">ELITE</option>
            </select>
            <p className="text-xs text-muted-foreground">
              PRO/ELITE dodelitev je dovoljena samo, ko je plačilo potrjeno.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.payment_confirmed}
              onChange={e => setForm(f => ({ ...f, payment_confirmed: e.target.checked }))}
            />
            Plačilo za paket je potrjeno
          </label>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Prekliči
            </Button>
            <Button type="submit" disabled={loading || !form.email || !form.business_name}>
              {loading ? 'Dodajam...' : 'Dodaj partnerja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
