'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

interface PartnerjiFiltersProps {
  defaultSearch: string
  defaultStatus: string
}

export function PartnerjiFilters({ defaultSearch, defaultStatus }: PartnerjiFiltersProps) {
  const router = useRouter()

  const navigate = (search: string, status: string) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    params.set('page', '1')
    router.push(`/admin/partnerji?${params.toString()}`)
  }

  return (
    <div className="flex gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Išči po imenu, emailu ali podjetju..."
          className="pl-9"
          defaultValue={defaultSearch}
          onChange={(e) => navigate(e.target.value, defaultStatus)}
        />
      </div>
      <select
        className="rounded-md border bg-background px-3 py-2 text-sm"
        defaultValue={defaultStatus}
        onChange={(e) => navigate(defaultSearch, e.target.value)}
      >
        <option value="">Vsi statusi</option>
        <option value="PENDING">Čakajo verifikacijo</option>
        <option value="AKTIVEN">Aktivni</option>
        <option value="SUSPENDIRAN">Suspendirani</option>
      </select>
    </div>
  )
}
