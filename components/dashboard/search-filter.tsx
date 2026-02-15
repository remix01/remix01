'use client'

import { useState } from 'react'
import { Search, Filter } from 'lucide-react'

interface SearchFilterProps {
  onSearch: (query: string, category: string, status: string) => void
}

export function SearchFilter({ onSearch }: SearchFilterProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const handleChange = (q: string, c: string, s: string) => {
    setQuery(q)
    setCategory(c)
    setStatus(s)
    onSearch(q, c, s)
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Iskanje in filtriranje</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Iskanje
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Iskanje naslova ali opisa..."
              value={query}
              onChange={(e) => handleChange(e.target.value, category, status)}
              className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Kategorija
          </label>
          <select
            value={category}
            onChange={(e) => handleChange(query, e.target.value, status)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Vse kategorije</option>
            <option value="vodovod">Vodovod</option>
            <option value="elektrika">Elektrika</option>
            <option value="gradnja">Gradnja</option>
            <option value="mizarstvo">Mizarstvo</option>
            <option value="zaključna">Zaključna dela</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => handleChange(query, category, e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Vsi statusi</option>
            <option value="pending">V teku</option>
            <option value="completed">Končano</option>
            <option value="cancelled">Opuščeno</option>
          </select>
        </div>
      </div>
    </div>
  )
}
