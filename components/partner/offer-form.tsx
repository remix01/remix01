'use client'

import React from "react"

import { useEffect, useState } from 'react'
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
  const [availableInquiries, setAvailableInquiries] = useState<Array<{ id: string; title: string }>>([])
  const [formData, setFormData] = useState({
    povprasevanje_id: '',
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

    if (!formData.povprasevanje_id) {
      setError('Izberite povpraševanje.')
      setLoading(false)
      return
    }

    const parsedPrice = parseFloat(formData.price)
    const parsedDuration = parseInt(formData.duration)
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Cena mora biti večja od 0.')
      setLoading(false)
      return
    }

    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      setError('Trajanje mora biti vsaj 1 dan.')
      setLoading(false)
      return
    }

    try {
      const composedMessage = [
        `Naslov: ${formData.title}`,
        `Kategorija: ${formData.category || 'Ni določeno'}`,
        `Trajanje: ${parsedDuration} dni`,
        '',
        formData.description,
        formData.notes ? `\nOpombe: ${formData.notes}` : '',
      ].join('\n')

      const { error: submitError } = await supabase.from('ponudbe').insert({
        povprasevanje_id: formData.povprasevanje_id,
        obrtnik_id: partnerId,
        message: composedMessage,
        price_estimate: parsedPrice,
        price_type: 'ocena',
        status: 'poslana',
      })

      if (submitError) throw submitError

      setFormData({
        povprasevanje_id: '',
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

  useEffect(() => {
    const loadInquiries = async () => {
      const { data } = await supabase
        .from('povprasevanja')
        .select('id, title')
        .eq('status', 'odprto')
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) {
        setAvailableInquiries(data)
      }
    }

    loadInquiries()
  }, [supabase])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="povprasevanje_id">Povpraševanje</Label>
          <Select
            value={formData.povprasevanje_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, povprasevanje_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izberite povpraševanje" />
            </SelectTrigger>
            <SelectContent>
              {availableInquiries.length === 0 ? (
                <SelectItem value="__none" disabled>
                  Trenutno ni odprtih povpraševanj
                </SelectItem>
              ) : (
                availableInquiries.map((inq) => (
                  <SelectItem key={inq.id} value={inq.id}>
                    {inq.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

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
            min="0.01"
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
            min="1"
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
