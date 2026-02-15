'use client'

import React from "react"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const CATEGORIES = [
  'Gradnja & adaptacije',
  'Vodovod & ogrevanje',
  'Elektrika & pametni sistemi',
  'Mizarstvo & kovinarstvo',
  'Zaključna dela',
  'Okna, vrata & senčila',
  'Okolica & zunanja ureditev',
  'Vzdrževanje & popravila',
  'Poslovne storitve',
]

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    notes: '',
  })

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await supabase.from('offers').insert([
        {
          partner_id: partnerId,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          duration: formData.duration,
          notes: formData.notes,
          status: 'active',
        },
      ])

      if (submitError) throw submitError

      setFormData({
        title: '',
        description: '',
        category: '',
        price: '',
        duration: '',
        notes: '',
      })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Prišlo je do napake pri oddaji ponudbe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Naslov ponudbe</Label>
          <Input
            id="title"
            name="title"
            placeholder="npr. Montaža novih oken"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Kategorija</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Izberite kategorijo" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
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
          value={formData.description}
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
            value={formData.price}
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
            value={formData.duration}
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
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Oddajam ponudbo...' : 'Oddajte ponudbo'}
      </Button>
    </form>
  )
}
