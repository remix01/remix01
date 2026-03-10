'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/types/marketplace'

interface CatalogFiltersProps {
  categories?: Category[]
  onFiltersChange: (filters: FilterState) => void
  loading?: boolean
}

export interface FilterState {
  search?: string
  category_id?: string
  location_city?: string
  min_rating?: number
  is_available?: boolean
}

export function CatalogFilters({
  categories = [],
  onFiltersChange,
  loading = false,
}: CatalogFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({})
  const [rating, setRating] = useState<number[]>([3])
  const [isPending, startTransition] = useTransition()

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    startTransition(() => {
      onFiltersChange(newFilters)
    })
  }

  const handleRatingChange = (value: number[]) => {
    setRating(value)
    handleFilterChange({ ...filters, min_rating: value[0] })
  }

  const handleResetFilters = () => {
    setFilters({})
    setRating([3])
    startTransition(() => {
      onFiltersChange({})
    })
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Filtri</h3>
          {Object.keys(filters).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={isPending || loading}
            >
              Počisti
            </Button>
          )}
        </div>

        {/* Search */}
        <div>
          <Label htmlFor="search">Iskanje</Label>
          <Input
            id="search"
            placeholder="Išči po imenu..."
            value={filters.search || ''}
            onChange={(e) =>
              handleFilterChange({ ...filters, search: e.target.value })
            }
            disabled={isPending || loading}
            className="mt-2"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <Label htmlFor="category">Kategorija</Label>
            <Select
              value={filters.category_id || ''}
              onValueChange={(value) =>
                handleFilterChange({
                  ...filters,
                  category_id: value || undefined,
                })
              }
              disabled={isPending || loading}
            >
              <SelectTrigger id="category" className="mt-2">
                <SelectValue placeholder="Izberi kategorijo" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location Filter */}
        <div>
          <Label htmlFor="location">Lokacija</Label>
          <Input
            id="location"
            placeholder="npr. Ljubljana"
            value={filters.location_city || ''}
            onChange={(e) =>
              handleFilterChange({ ...filters, location_city: e.target.value })
            }
            disabled={isPending || loading}
            className="mt-2"
          />
        </div>

        {/* Rating Filter */}
        <div>
          <Label>Najmanjša ocena: {rating[0].toFixed(1)}</Label>
          <Slider
            value={rating}
            onValueChange={handleRatingChange}
            min={1}
            max={5}
            step={0.5}
            disabled={isPending || loading}
            className="mt-4"
          />
          <div className="flex gap-2 text-xs text-slate-500 mt-2">
            <span>1</span>
            <span className="flex-1" />
            <span>5</span>
          </div>
        </div>

        {/* Availability Filter */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="available"
            checked={filters.is_available || false}
            onChange={(e) =>
              handleFilterChange({
                ...filters,
                is_available: e.target.checked || undefined,
              })
            }
            disabled={isPending || loading}
            className="rounded"
          />
          <Label htmlFor="available" className="cursor-pointer">
            Samo dostopni
          </Label>
        </div>

        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Aktivni filtri:</p>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    handleFilterChange({ ...filters, search: undefined })
                  }
                >
                  {filters.search} ✕
                </Badge>
              )}
              {filters.category_id && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    handleFilterChange({ ...filters, category_id: undefined })
                  }
                >
                  Kategorija ✕
                </Badge>
              )}
              {filters.location_city && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    handleFilterChange({
                      ...filters,
                      location_city: undefined,
                    })
                  }
                >
                  {filters.location_city} ✕
                </Badge>
              )}
              {filters.min_rating && filters.min_rating > 3 && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    handleFilterChange({
                      ...filters,
                      min_rating: undefined,
                    })
                  }
                >
                  {filters.min_rating}+ ⭐ ✕
                </Badge>
              )}
              {filters.is_available && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    handleFilterChange({
                      ...filters,
                      is_available: undefined,
                    })
                  }
                >
                  Dostopni ✕
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
