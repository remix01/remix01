'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface CatalogFiltersProps {
  specialnosti: Array<{ name: string; slug: string }>
  lokacije: string[]
  currentFilters?: {
    minRating?: number
    search?: string
    kategorija?: string
    lokacija?: string
  }
}

export function CatalogFilters({
  specialnosti,
  lokacije,
  currentFilters = {},
}: CatalogFiltersProps) {
  const router = useRouter()
  const [search, setSearch] = useState(currentFilters.search || '')
  const [kategorija, setKategorija] = useState(currentFilters.kategorija || '')
  const [lokacija, setLokacija] = useState(currentFilters.lokacija || '')
  const [minRating, setMinRating] = useState(currentFilters.minRating || 0)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (kategorija) params.set('kategorija', kategorija)
    if (lokacija) params.set('lokacija', lokacija)
    if (minRating > 0) params.set('rating', minRating.toString())
    router.push(`/mojstri?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setKategorija('')
    setLokacija('')
    setMinRating(0)
    router.push('/mojstri')
  }

  const hasFilters = search || kategorija || lokacija || minRating > 0

  return (
    <div className="sticky top-24 space-y-5 bg-background border border-border rounded-xl p-5">
      <h2 className="font-semibold text-foreground text-sm">Filtri</h2>

      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Iskanje</label>
        <input
          type="text"
          placeholder="Ime, podjetje..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Kategorija */}
      {specialnosti.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Kategorija</label>
          <select
            value={kategorija}
            onChange={(e) => setKategorija(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Vse kategorije</option>
            {specialnosti.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lokacija */}
      {lokacije.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mesto</label>
          <select
            value={lokacija}
            onChange={(e) => setLokacija(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Vsa mesta</option>
            {lokacije.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Minimalna ocena</label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(parseFloat(e.target.value))}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="0">Vse</option>
          <option value="3">3+ ★</option>
          <option value="3.5">3.5+ ★</option>
          <option value="4">4+ ★</option>
          <option value="4.5">4.5+ ★</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="border-t pt-4 space-y-2">
        <Button onClick={applyFilters} className="w-full">Išči</Button>
        {hasFilters && (
          <Button onClick={clearFilters} variant="outline" className="w-full gap-2">
            <X className="w-4 h-4" />
            Počisti filtre
          </Button>
        )}
      </div>
    </div>
  )
}
