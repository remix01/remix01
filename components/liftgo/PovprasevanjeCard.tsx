import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, Euro } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { UrgencyBadge } from './UrgencyBadge'
import type { Povprasevanje, Category } from '@/types/liftgo.types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'

interface PovprasevanjeCardProps {
  povprasevanje: Povprasevanje & { categories?: Category }
  ponudbeCount?: number
  href: string
}

export function PovprasevanjeCard({ povprasevanje, ponudbeCount = 0, href }: PovprasevanjeCardProps) {
  return (
    <Card className="group transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {povprasevanje.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {povprasevanje.description}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <StatusBadge status={povprasevanje.status} />
            <UrgencyBadge urgency={povprasevanje.urgency} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {povprasevanje.categories && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{povprasevanje.categories.name}</span>
            </div>
          )}
          
          {povprasevanje.location_city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{povprasevanje.location_city}</span>
            </div>
          )}

          {povprasevanje.preferred_date_from && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(povprasevanje.preferred_date_from), 'd. MMM yyyy', { locale: sl })}
              </span>
            </div>
          )}

          {(povprasevanje.budget_min || povprasevanje.budget_max) && (
            <div className="flex items-center gap-1">
              <Euro className="h-4 w-4" />
              <span>
                {povprasevanje.budget_min && povprasevanje.budget_max
                  ? `${povprasevanje.budget_min}€ - ${povprasevanje.budget_max}€`
                  : 'Po dogovoru'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Oddano {format(new Date(povprasevanje.created_at), 'd. MMM yyyy', { locale: sl })}
            {ponudbeCount > 0 && (
              <span className="ml-2 font-medium text-primary">
                {ponudbeCount} {ponudbeCount === 1 ? 'ponudba' : ponudbeCount === 2 ? 'ponudbi' : 'ponudb'}
              </span>
            )}
          </div>

          <Button asChild size="sm">
            <Link href={href}>
              {ponudbeCount > 0 ? 'Poglej ponudbe' : 'Podrobnosti'}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
