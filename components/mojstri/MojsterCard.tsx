import type { ObrtnikiPublic } from '@/lib/dal/obrtniki'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin } from 'lucide-react'
import Link from 'next/link'

interface MojsterCardProps {
  obrtnik: ObrtnikiPublic
  categories?: Array<{ name: string; slug: string; icon_name?: string | null }>
  isAvailable?: boolean
  hourlyRate?: number | null
  yearsExperience?: number | null
}

export function MojsterCard({
  obrtnik,
  categories = [],
  isAvailable = false,
  hourlyRate = null,
  yearsExperience = null,
}: MojsterCardProps) {
  const { profiles } = obrtnik
  const initials = (profiles.full_name || 'MO')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const topCategories = categories.slice(0, 2)

  return (
    <Link href={`/mojstri/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="font-bold text-base text-foreground truncate leading-tight">
                  {obrtnik.business_name}
                </h3>
                {obrtnik.subscription_tier === 'pro' && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-1.5 py-0 flex-shrink-0 h-5">
                    PRO
                  </Badge>
                )}
              </div>
              {isAvailable ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Na voljo
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Obrtnik</span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex-1">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {obrtnik.description || obrtnik.tagline || (topCategories[0]?.name ?? 'Obrtnik')}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(obrtnik.avg_rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-sm text-foreground">
              {Number(obrtnik.avg_rating).toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({obrtnik.total_reviews ?? 0} {(obrtnik.total_reviews ?? 0) === 1 ? 'ocena' : 'ocen'})
            </span>
          </div>

          {/* Location + experience */}
          <div className="flex items-center justify-between text-sm">
            {profiles.location_city && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{profiles.location_city}</span>
              </div>
            )}
            {yearsExperience && (
              <span className="text-xs text-muted-foreground ml-auto">
                {yearsExperience} let izkušenj
              </span>
            )}
          </div>

          {/* Price */}
          {hourlyRate ? (
            <p className="text-sm font-semibold text-foreground">od {hourlyRate} €/uro</p>
          ) : (
            <p className="text-sm text-muted-foreground">Cena po dogovoru</p>
          )}

          {/* Categories */}
          {topCategories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {topCategories.map((cat, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 font-normal"
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
