'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { dodajPovprasevanjeAdmin } from '@/app/admin/actions'

interface CategoryOption {
  id: string
  name: string
}

interface CustomerOption {
  id: string
  full_name: string | null
  email: string | null
}

interface DodajPovprasevanjeModalProps {
  categories: CategoryOption[]
  customers: CustomerOption[]
}

export function DodajPovprasevanjeModal({ categories, customers }: DodajPovprasevanjeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    narocnik_id: '',
    category_id: '',
    title: '',
    description: '',
    location_city: '',
    location_region: '',
    urgency: 'normalno' as 'normalno' | 'kmalu' | 'nujno',
    budget_min: '',
    budget_max: '',
    preferred_date_from: '',
    preferred_date_to: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.narocnik_id || !form.category_id || !form.title || !form.description || !form.location_city) return

    setLoading(true)
    setError(null)
    try {
      const result = await dodajPovprasevanjeAdmin({
        narocnik_id: form.narocnik_id,
        category_id: form.category_id,
        title: form.title,
        description: form.description,
        location_city: form.location_city,
        location_region: form.location_region || undefined,
        urgency: form.urgency,
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        preferred_date_from: form.preferred_date_from || undefined,
        preferred_date_to: form.preferred_date_to || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Napaka pri dodajanju povpraševanja')
        return
      }

      setOpen(false)
      setForm({
        narocnik_id: '',
        category_id: '',
        title: '',
        description: '',
        location_city: '',
        location_region: '',
        urgency: 'normalno',
        budget_min: '',
        budget_max: '',
        preferred_date_from: '',
        preferred_date_to: '',
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Novo povpraševanje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ročni vnos povpraševanja</DialogTitle>
          <DialogDescription>
            Admin lahko ročno vnese povpraševanje za obstoječo stranko.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="narocnik_id">Stranka *</Label>
              <select
                id="narocnik_id"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.narocnik_id}
                onChange={(e) => setForm((f) => ({ ...f, narocnik_id: e.target.value }))}
                required
              >
                <option value="">Izberi stranko</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {(customer.full_name || 'Brez imena')} · {customer.email || 'brez emaila'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Kategorija *</Label>
              <select
                id="category_id"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                required
              >
                <option value="">Izberi kategorijo</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Naslov *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Npr. Menjava vodovodne cevi v kuhinji"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Opis *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Podroben opis težave in želja stranke..."
              rows={4}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location_city">Mesto *</Label>
              <Input
                id="location_city"
                value={form.location_city}
                onChange={(e) => setForm((f) => ({ ...f, location_city: e.target.value }))}
                placeholder="Ljubljana"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location_region">Regija</Label>
              <Input
                id="location_region"
                value={form.location_region}
                onChange={(e) => setForm((f) => ({ ...f, location_region: e.target.value }))}
                placeholder="Osrednjeslovenska"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="urgency">Nujnost</Label>
              <select
                id="urgency"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value as 'normalno' | 'kmalu' | 'nujno' }))}
              >
                <option value="normalno">Normalno</option>
                <option value="kmalu">Kmalu</option>
                <option value="nujno">Nujno</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget_min">Budget min (€)</Label>
              <Input
                id="budget_min"
                type="number"
                min={0}
                value={form.budget_min}
                onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget_max">Budget max (€)</Label>
              <Input
                id="budget_max"
                type="number"
                min={0}
                value={form.budget_max}
                onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="preferred_date_from">Želen datum od</Label>
              <Input
                id="preferred_date_from"
                type="date"
                value={form.preferred_date_from}
                onChange={(e) => setForm((f) => ({ ...f, preferred_date_from: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferred_date_to">Želen datum do</Label>
              <Input
                id="preferred_date_to"
                type="date"
                value={form.preferred_date_to}
                onChange={(e) => setForm((f) => ({ ...f, preferred_date_to: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Prekliči
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.narocnik_id || !form.category_id || !form.title || !form.description || !form.location_city}
            >
              {loading ? 'Shranjujem...' : 'Ustvari povpraševanje'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
