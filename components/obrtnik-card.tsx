'use client'

import type { ObrtnikProfile } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Star, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ObrtnikCardProps {
  obrtnik: ObrtnikProfile
}

export function ObrtnikCard({ obrtnik }: ObrtnikCardProps) {
  const avgRating = obrtnik.avg_rating || 0
  const reviewCount = obrtnik.review_count || 0

  return (
    <Link href={`/obrtnik/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {obrtnik.profile?.avatar_url && (
          <div className="relative w-full h-48 bg-gray-200">
            <Image
              src={obrtnik.profile.avatar_url}
              alt={obrtnik.profile?.full_name || 'Obrtnik'}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">
            {obrtnik.profile?.full_name}
          </h3>
          
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {obrtnik.profile?.location_city}
          </div>
          
          <div className="flex items-center gap-1 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(avgRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {avgRating.toFixed(1)} ({reviewCount})
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {obrtnik.bio}
          </p>
        </div>
      </Card>
    </Link>
  )
}
