'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

export function StrankeSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Išči po imenu ali emailu..."
        className="pl-9"
        defaultValue={defaultValue}
        onChange={(e) => {
          const params = new URLSearchParams()
          if (e.target.value) params.set('search', e.target.value)
          params.set('page', '1')
          router.push(`/admin/stranke?${params.toString()}`)
        }}
      />
    </div>
  )
}
