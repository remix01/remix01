'use client'

import type { Ocena } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface ReviewCardProps {
  review: Ocena
}

export function ReviewCard({ review }: ReviewCardProps) {
  if (!review.narocnik) return null

  return (
    <Card className="p-4 border border-slate-200">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-semibold text-slate-900">
            {review.narocnik.full_name}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(review.created_at).toLocaleDateString('sl-SI')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="text-slate-700 text-sm leading-relaxed">
          {review.comment}
        </p>
      )}
    </Card>
  )
}
