'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface CatalogFiltersProps {
  specialnosti: string[]
  lokacije: string[]
  currentFilters?: {
    minRating?: number
    search?: string
  }
}

export function CatalogFilters({
  specialnosti: _unused1,
  lokacije: _unused2,
  currentFilters = {},
}: CatalogFiltersProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(currentFilters.search || '')
  const [minRating, setMinRating] = useState(currentFilters.minRating || 0)

  const applyFilters = () => {
    const params = new URLSearchParams()

    if (searchQuery) {
      params.set('search', searchQuery)
    }

    if (minRating > 0) {
      params.set('rating', minRating.toString())
    }

    router.push(`/mojstri?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setMinRating(0)
    router.push('/mojstri')
  }

  const hasFilters = searchQuery || minRating > 0

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
