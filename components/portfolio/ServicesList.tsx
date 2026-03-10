'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/types/marketplace'

interface ServicesListProps {
  services: Category[]
}

export function ServicesList({ services }: ServicesListProps) {
  if (!services || services.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service) => (
        <Link
          key={service.id}
          href={`/mojstri?category_id=${service.id}`}
          className="hover:no-underline"
        >
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-slate-200"
          >
            {service.name}
          </Badge>
        </Link>
      ))}
    </div>
  )
}
