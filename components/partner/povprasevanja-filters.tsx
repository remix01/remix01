'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  activeCategory?: string
  activeUrgency?: string
  totalCount: number
}

const ALL = '__all__'

const URGENCY_OPTIONS = [
  { value: ALL, label: 'Vse' },
  { value: 'nujno', label: 'Nujno' },
  { value: 'ta_teden', label: 'Ta teden' },
] as const

export function PovprasevanjaFilters({ categories, activeCategory, activeUrgency, totalCount }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearAll = () => router.push(pathname)

  const hasActiveFilters = activeCategory || activeUrgency

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={activeCategory ?? ALL}
          onValueChange={(val) => update('category', val === ALL ? '' : val)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Vse kategorije" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vse kategorije</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5">
          {URGENCY_OPTIONS.map(({ value, label }) => {
            const paramValue = value === ALL ? '' : value
            const isActive = (activeUrgency ?? '') === paramValue
            return (
              <Button
                key={label}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => update('urgency', paramValue)}
              >
                {label}
              </Button>
            )
          })}
        </div>

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="text-muted-foreground">
            Počisti ×
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? 'povpraševanje' : totalCount < 5 ? 'povpraševanja' : 'povpraševanj'}
      </p>
    </div>
  )
}
