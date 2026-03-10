'use client'

import { Star } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface RatingDisplayProps {
  average: number
  total: number
  distribution: Record<number, number>
}

export function RatingDisplay({
  average,
  total,
  distribution,
}: RatingDisplayProps) {
  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-slate-50">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {average.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(average)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">
            na podlagi {total} ocen
          </p>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating] || 0
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium w-6">{rating}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {Math.round(percentage)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
