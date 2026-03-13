import type { ObrtnikProfile } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, CheckCircle, Zap } from 'lucide-react'
import Link from 'next/link'

interface MojsterCardProps {
  id: string
  business_name: string
  description?: string
  is_verified: boolean
  avg_rating: number
  total_reviews: number
  is_available: boolean
  enable_instant_offers: boolean
  location_city?: string
  location_region?: string
  kategorije: { name: string; slug: string; icon_name?: string }[]
}

export function MojsterCard({
  id,
  business_name,
  description,
  is_verified,
  avg_rating,
  total_reviews,
  is_available,
  enable_instant_offers,
  location_city,
  location_region,
  kategorije,
}: MojsterCardProps) {
  return (
    <Link href={`/obrtniki/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Header with Verified Badge */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">
                {business_name}
              </h3>
              {description && (
                <p className="text-sm text-slate-600 line-clamp-1 mt-1">
                  {description}
                </p>
              )}
            </div>
            {is_verified && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Location */}
          {location_city && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>
                {location_city}
                {location_region && `, ${location_region}`}
              </span>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">
                {avg_rating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              ({total_reviews} ocen)
            </span>
          </div>

          {/* Categories */}
          {kategorije && kategorije.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {kategorije.slice(0, 3).map((cat) => (
                <Badge key={cat.slug} variant="secondary" className="text-xs">
                  {cat.name}
                </Badge>
              ))}
              {kategorije.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{kategorije.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Instant Offers Badge */}
          {enable_instant_offers && (
            <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center gap-1 w-fit">
              <Zap className="w-3 h-3" />
              Instant ponudba
            </Badge>
          )}

          {/* Availability Dot */}
          <div className="flex items-center gap-2 pt-1">
            <div
              className={`w-2 h-2 rounded-full ${
                is_available ? 'bg-green-500' : 'bg-slate-300'
              }`}
            />
            <span className="text-xs text-slate-600">
              {is_available ? 'Dostopen' : 'Ni dostopen'}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
