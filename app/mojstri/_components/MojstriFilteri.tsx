'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface Props {
  categories: Array<{ id: string; name: string }>
  current: Record<string, string>
}

export default function MojstriFilteri({ categories, current }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    for (const [key, value] of fd.entries()) {
      if (value && String(value).trim()) {
        params.set(key, String(value).trim())
      }
    }
    startTransition(() => {
      router.push(`/mojstri?${params.toString()}`)
    })
  }

  function reset() {
    startTransition(() => {
      router.push('/mojstri')
    })
  }

  const hasFilters = Object.values(current).some(Boolean)

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Ime ali opis..."
          className="pl-9"
          defaultValue={current.q || ''}
        />
      </div>

      {/* City */}
      <Input
        name="city"
        placeholder="Mesto..."
        className="w-36"
        defaultValue={current.city || ''}
      />

      {/* Category */}
      <select
        name="category"
        defaultValue={current.category || ''}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Vse kategorije</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Rating */}
      <select
        name="rating"
        defaultValue={current.rating || ''}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Vse ocene</option>
        <option value="4">4+ ⭐</option>
        <option value="4.5">4.5+ ⭐</option>
        <option value="5">5 ⭐</option>
      </select>

      <Button type="submit" disabled={isPending} className="min-h-[40px]">
        {isPending ? 'Iščem...' : 'Iskanje'}
      </Button>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          disabled={isPending}
          className="min-h-[40px]"
        >
          Počisti
        </Button>
      )}
    </form>
  )
}
