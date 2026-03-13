'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import type { Category } from '@/types/marketplace'

interface CatalogFiltersProps {
  kategorije: Category[]
  activeKategorijaSlug?: string
}

export function CatalogFilters({
  kategorije,
  activeKategorijaSlug,
}: CatalogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [dostopniOnly, setDostopniOnly] = useState(
    searchParams.get('available') === '1'
  )
  const [verificirani, setVerificirani] = useState(
    searchParams.get('verified') === '1'
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateParams({ q: value, stran: '1' })
  }

  const handleDostopniChange = (checked: boolean) => {
    setDostopniOnly(checked)
    updateParams({ available: checked ? '1' : '', stran: '1' })
  }

  const handleVerificianiChange = (checked: boolean) => {
    setVerificirani(checked)
    updateParams({ verified: checked ? '1' : '', stran: '1' })
  }

  const handleKategorijaClick = (slug: string) => {
    const newSlug = activeKategorijaSlug === slug ? '' : slug
    updateParams({ kategorija: newSlug, stran: '1' })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setDostopniOnly(false)
    setVerificirani(false)
    startTransition(() => {
      router.push('/mojstri')
    })
  }

  const updateParams = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === undefined) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    startTransition(() => {
      const newUrl = `/mojstri${params.toString() ? '?' + params.toString() : ''}`
      router.push(newUrl)
    })
  }

  const hasActiveFilters =
    activeKategorijaSlug || searchQuery || dostopniOnly || verificirani

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Iskanje
        </label>
        <Input
          type="text"
          placeholder="Iskanje mojstrov..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={isPending}
          className="w-full"
        />
      </div>

      {/* Categories */}
      {kategorije.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-3">
            Kategorije
          </label>
          <div className="space-y-2">
            <Button
              variant={!activeKategorijaSlug ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleKategorijaClick('')}
              disabled={isPending}
              className="w-full justify-start"
            >
              Vse kategorije
            </Button>
            {kategorije.map((kat) => (
              <Button
                key={kat.id}
                variant={activeKategorijaSlug === kat.slug ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleKategorijaClick(kat.slug)}
                disabled={isPending}
                className="w-full justify-start"
              >
                {kat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={dostopniOnly}
            onCheckedChange={handleDostopniChange}
            disabled={isPending}
          />
          <span className="text-sm text-slate-900">Samo dostopni</span>
        </label>
      </div>

      {/* Verified Only */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={verificirani}
            onCheckedChange={handleVerificianiChange}
            disabled={isPending}
          />
          <span className="text-sm text-slate-900">Samo verificirani</span>
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          disabled={isPending}
          className="w-full justify-start gap-2"
        >
          <X className="w-4 h-4" />
          Počisti filtere
        </Button>
      )}
    </div>
  )
}
