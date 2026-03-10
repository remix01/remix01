'use client'

import { useState, useTransition } from 'react'
import { CraftsmanCard } from './CraftsmanCard'
import { CatalogFilters, type FilterState } from './CatalogFilters'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'
import type { ObrtnikProfile, Category } from '@/types/marketplace'

interface CraftsmanCatalogProps {
  initialCraftsmen?: ObrtnikProfile[]
  categories?: Category[]
  onFilterChange?: (filters: FilterState) => Promise<ObrtnikProfile[]>
}

export function CraftsmanCatalog({
  initialCraftsmen = [],
  categories = [],
  onFilterChange,
}: CraftsmanCatalogProps) {
  const [craftsmen, setCraftsmen] = useState<ObrtnikProfile[]>(initialCraftsmen)
  const [filters, setFilters] = useState<FilterState>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  
  const itemsPerPage = 12
  const totalPages = Math.ceil(craftsmen.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedCraftsmen = craftsmen.slice(startIdx, startIdx + itemsPerPage)

  const handleFiltersChange = (newFilters: FilterState) => {
    setCurrentPage(1)
    setFilters(newFilters)
    
    if (onFilterChange) {
      startTransition(async () => {
        const results = await onFilterChange(newFilters)
        setCraftsmen(results)
      })
    } else {
      // Client-side filtering fallback
      let filtered = initialCraftsmen

      if (newFilters.search) {
        const search = newFilters.search.toLowerCase()
        filtered = filtered.filter(
          (c) =>
            c.business_name.toLowerCase().includes(search) ||
            c.description?.toLowerCase().includes(search)
        )
      }

      if (newFilters.category_id) {
        filtered = filtered.filter((c) =>
          c.categories?.some((cat) => cat.id === newFilters.category_id)
        )
      }

      if (newFilters.location_city) {
        filtered = filtered.filter(
          (c) =>
            c.profile?.location_city === newFilters.location_city
        )
      }

      if (newFilters.min_rating) {
        filtered = filtered.filter(
          (c) => c.avg_rating >= newFilters.min_rating!
        )
      }

      if (newFilters.is_available) {
        filtered = filtered.filter((c) => c.is_available)
      }

      setCraftsmen(filtered)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <aside className="lg:col-span-1">
        <div className="sticky top-4">
          <CatalogFilters
            categories={categories}
            onFiltersChange={handleFiltersChange}
            loading={isPending}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:col-span-3">
        {/* Results Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            Dostopni mojstri
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            {isPending ? 'Nalagam...' : `Prikazano ${paginatedCraftsmen.length} od ${craftsmen.length} mojstrov`}
          </p>
        </div>

        {/* Loading State */}
        {isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Empty State */}
        {!isPending && craftsmen.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-600 mb-4">
              Ni mojstrov, ki bi ustrezali vašim kriterijem.
            </p>
            <Button
              variant="outline"
              onClick={() => handleFiltersChange({})}
            >
              Počisti filtere
            </Button>
          </div>
        )}

        {/* Craftsmen Grid */}
        {!isPending && craftsmen.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {paginatedCraftsmen.map((craftsman) => (
                <CraftsmanCard
                  key={craftsman.id}
                  obrtnik={craftsman}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isPending}
                >
                  Prejšnja
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, currentPage - 2) + i
                  if (page > totalPages) return null
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={isPending}
                    >
                      {page}
                    </Button>
                  )
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isPending}
                >
                  Naslednja
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
