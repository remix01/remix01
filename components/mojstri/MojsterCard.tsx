import type { ObrtnikiPublic } from '@/lib/dal/obrtniki'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Shield, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface MojsterCardProps {
  obrtnik: ObrtnikiPublic
  categories?: Array<{ name: string; icon_name?: string | null }>
  isAvailable?: boolean
  hourlyRate?: number | null
  yearsExperience?: number | null
}

export function MojsterCard({ 
  obrtnik, 
  categories = [],
  isAvailable = false,
  hourlyRate = null,
  yearsExperience = null
}: MojsterCardProps) {
  const { profiles } = obrtnik
  const initials = profiles.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const topCategories = categories.slice(0, 2)
  const totalReviews = Math.floor(obrtnik.avg_rating * 10) // placeholder for total reviews

  return (
    <Link href={`/mojstri/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer h-full flex flex-col">
        {/* Header with avatar and badges */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-start gap-3">
            {/* Avatar with initials */}
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              {initials}
            </div>

            {/* Business name and badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {obrtnik.business_name}
                </h3>
                {obrtnik.subscription_tier === 'pro' && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs px-1 py-0 flex-shrink-0">
                    PRO
                  </Badge>
                )}
              </div>
              {isAvailable && (
                <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                  🟢 Na voljo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex-1">
          {/* Tagline or top category */}
          <p className="text-sm text-muted-foreground line-clamp-1">
            {obrtnik.description || (topCategories[0]?.name || 'Obrtnik')}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(obrtnik.avg_rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-sm text-foreground">
              {obrtnik.avg_rating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({totalReviews} ocen)
            </span>
          </div>

          {/* Location */}
          {profiles.location_city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{profiles.location_city}</span>
            </div>
          )}

          {/* Hourly rate */}
          {hourlyRate ? (
            <p className="text-sm font-medium text-foreground">
              od {hourlyRate}€/uro
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Po dogovoru
            </p>
          )}

          {/* Top 2 categories */}
          {topCategories.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {topCategories.map((cat, idx) => (
                <Badge
                  key={idx}
                  className="bg-primary/10 text-primary text-xs px-2 py-0.5 font-normal"
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
