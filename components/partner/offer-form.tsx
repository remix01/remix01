'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { CreateOfferPayload } from '@/lib/types/offer'

interface Inquiry {
  id: string
  title: string
}

interface Category {
  id: string
  name: string
}

interface FormState {
  povprasevanje_id: string
  description: string
  category: string
  price: string
  duration: string
  notes: string
}

const EMPTY_FORM: FormState = {
  povprasevanje_id: '',
  description: '',
  category: '',
  price: '',
  duration: '',
  notes: '',
}

export function OfferForm({
  partnerId,
  onSuccess,
}: {
  partnerId: string
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    const load = async () => {
      const [{ data: inquiryData }, { data: categoryData }] = await Promise.all([
        supabase
          .from('povprasevanja')
          .select('id, title')
          .eq('status', 'odprto')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order'),
      ])
      if (inquiryData) setInquiries(inquiryData)
      if (categoryData) setCategories(categoryData)
    }
    load()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.povprasevanje_id) {
      setError('Izberite povpraševanje.')
      return
    }
    const price = parseFloat(form.price)
    const duration = parseInt(form.duration, 10)
    if (!Number.isFinite(price) || price <= 0) {
      setError('Cena mora biti večja od 0.')
      return
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Trajanje mora biti vsaj 1 dan.')
      return
    }

    const message = [
      `Kategorija: ${form.category || 'Ni določeno'}`,
      `Trajanje: ${duration} dni`,
      '',
      form.description,
      form.notes ? `\nOpombe: ${form.notes}` : '',
    ].join('\n')

    const payload: CreateOfferPayload = {
      povprasevanje_id: form.povprasevanje_id,
      message,
      price_estimate: price,
    }

    setLoading(true)
    try {
      const res = await fetch('/api/partner/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result?.error || 'Prišlo je do napake pri oddaji ponudbe.')
        return
      }
      setForm(EMPTY_FORM)
      onSuccess()
    } catch {
      setError('Prišlo je do napake pri oddaji ponudbe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="povprasevanje_id">Povpraševanje</Label>
          <Select
            value={form.povprasevanje_id}
            onValueChange={(value) => setForm((prev) => ({ ...prev, povprasevanje_id: value }))}
          >
            <SelectTrigger id="povprasevanje_id">
              <SelectValue placeholder="Izberite povpraševanje" />
            </SelectTrigger>
            <SelectContent>
              {inquiries.length === 0 ? (
                <SelectItem value="__none" disabled>
                  Trenutno ni odprtih povpraševanj
                </SelectItem>
              ) : (
                inquiries.map((inq) => (
                  <SelectItem key={inq.id} value={inq.id}>
                    {inq.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Kategorija</Label>
          <Select
            value={form.category}
            onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Izberite kategorijo" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Opis ponudbe</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detaljno opišite storitev in kaj je vključeno..."
          value={form.description}
          onChange={handleChange}
          rows={4}
          required
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="price">Cena (EUR)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0.01"
            value={form.price}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="duration">Trajanje (dni)</Label>
          <Input
            id="duration"
            name="duration"
            type="number"
            placeholder="7"
            min="1"
            value={form.duration}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Dodatne opombe</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Dodatne informacije, pogoji, posebnosti..."
          value={form.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Oddajam ponudbo...' : 'Oddajte ponudbo'}
      </Button>
    </form>
  )
}
