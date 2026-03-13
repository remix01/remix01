'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'

interface CatalogFiltersProps {
  specialnosti: string[]
  lokacije: string[]
  currentFilters?: {
    specialnosti?: string[]
    lokacije?: string[]
    minRating?: number
    search?: string
  }
}

export function CatalogFilters({
  specialnosti,
  lokacije,
  currentFilters = {},
}: CatalogFiltersProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(currentFilters.search || '')
  const [selectedSpecialnosti, setSelectedSpecialnosti] = useState<Set<string>>(
    new Set(currentFilters.specialnosti || [])
  )
  const [selectedLokacije, setSelectedLokacije] = useState<Set<string>>(
    new Set(currentFilters.lokacije || [])
  )
  const [minRating, setMinRating] = useState(currentFilters.minRating || 0)

  const applyFilters = () => {
    const params = new URLSearchParams()

    if (searchQuery) {
      params.set('search', searchQuery)
    }

    selectedSpecialnosti.forEach((s) => {
      params.append('specialnosti', s)
    })

    selectedLokacije.forEach((l) => {
      params.append('lokacije', l)
    })

    if (minRating > 0) {
      params.set('rating', minRating.toString())
    }

    router.push(`/mojstri?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSpecialnosti(new Set())
    setSelectedLokacije(new Set())
    setMinRating(0)
    router.push('/mojstri')
  }

  const hasFilters =
    searchQuery ||
    selectedSpecialnosti.size > 0 ||
    selectedLokacije.size > 0 ||
    minRating > 0

  return (
    <div className="sticky top-24 space-y-6">
      {/* Search Input */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Iskanje
        </label>
        <input
          type="text"
          placeholder="Ime, podjetje..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Specialnosti */}
      {specialnosti.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-3">
            Specialnosti
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {specialnosti.map((spec) => (
              <label
                key={spec}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded"
              >
                <Checkbox
                  checked={selectedSpecialnosti.has(spec)}
                  onCheckedChange={(checked) => {
                    const updated = new Set(selectedSpecialnosti)
                    if (checked) {
                      updated.add(spec)
                    } else {
                      updated.delete(spec)
                    }
                    setSelectedSpecialnosti(updated)
                  }}
                />
                <span className="text-sm text-slate-700">{spec}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Lokacije */}
      {lokacije.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-3">
            Lokacije
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lokacije.map((loc) => (
              <label
                key={loc}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded"
              >
                <Checkbox
                  checked={selectedLokacije.has(loc)}
                  onCheckedChange={(checked) => {
                    const updated = new Set(selectedLokacije)
                    if (checked) {
                      updated.add(loc)
                    } else {
                      updated.delete(loc)
                    }
                    setSelectedLokacije(updated)
                  }}
                />
                <span className="text-sm text-slate-700">{loc}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Minimalna ocena
        </label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(parseFloat(e.target.value))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="0">Vse</option>
          <option value="3">3+</option>
          <option value="3.5">3.5+</option>
          <option value="4">4+</option>
          <option value="4.5">4.5+</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="border-t pt-4 space-y-2">
        <Button onClick={applyFilters} className="w-full">
          Uporabi filtre
        </Button>
        {hasFilters && (
          <Button
            onClick={clearFilters}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <X className="w-4 h-4" />
            Počisti filtre
          </Button>
        )}
      </div>
    </div>
  )
}
