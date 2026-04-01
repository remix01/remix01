'use client'

import type React from 'react'
import type { ObrtnikProfile } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface CraftsmanCardProps {
  key?: React.Key
  obrtnik: ObrtnikProfile
}

export function CraftsmanCard({ obrtnik }: CraftsmanCardProps) {
  return (
    <Link href={`/obrtniki/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Header with Verified Badge */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">
                {obrtnik.business_name}
              </h3>
              {obrtnik.description && (
                <p className="text-sm text-slate-600 line-clamp-1 mt-1">
                  {obrtnik.description}
                </p>
              )}
            </div>
            {obrtnik.is_verified && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{obrtnik.profile?.location_city}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">
                {obrtnik.avg_rating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              ({obrtnik.total_reviews} ocen)
            </span>
          </div>

          {/* Categories */}
          {obrtnik.categories && obrtnik.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {obrtnik.categories.slice(0, 2).map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs">
                  {cat.name}
                </Badge>
              ))}
              {obrtnik.categories.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{obrtnik.categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Availability */}
          {obrtnik.is_available && (
            <Badge className="bg-green-50 text-green-700 hover:bg-green-100">
              Dostopen
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  )
}
