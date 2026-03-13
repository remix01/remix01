import type { ObrtnikiPublic } from '@/lib/dal/obrtniki'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Shield } from 'lucide-react'
import Link from 'next/link'

interface MojsterCardProps {
  obrtnik: ObrtnikiPublic
}

export function MojsterCard({ obrtnik }: MojsterCardProps) {
  const { profiles } = obrtnik
  const initials = profiles.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Link href={`/obrtniki/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 truncate">
                  {obrtnik.business_name}
                </h3>
                {obrtnik.is_verified && (
                  <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500">{profiles.full_name}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Description */}
          {obrtnik.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {obrtnik.description}
            </p>
          )}

          {/* Location */}
          {profiles.location_city && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {profiles.location_city}
                {profiles.location_region && `, ${profiles.location_region}`}
              </span>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(obrtnik.avg_rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-sm">
              {obrtnik.avg_rating.toFixed(1)}
            </span>
          </div>

          {/* Subscription tier badge */}
          <Badge
            variant={obrtnik.subscription_tier === 'pro' ? 'default' : 'secondary'}
            className="w-fit text-xs"
          >
            {obrtnik.subscription_tier === 'pro' ? '⭐ Pro' : 'Start'}
          </Badge>
        </div>
      </Card>
    </Link>
  )
}
