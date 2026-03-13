'use client'

import { Star, MessageCircle, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ReviewsTabProps {
  obrtnik: any
  reviews: any[]
}

export function ReviewsTab({ obrtnik, reviews }: ReviewsTabProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Še ni ocen. Bodite prvi, ki bo dal oceno!</p>
      </div>
    )
  }

  // Calculate rating distribution
  const distribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  }

  const total = reviews.length

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Overall Rating */}
        <div className="space-y-4">
          <div>
            <p className="text-5xl font-bold text-gray-900">{obrtnik.avg_rating.toFixed(1)}</p>
            <p className="text-gray-600">od {total} ocen</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${
                  i < Math.floor(obrtnik.avg_rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">{rating} ★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400"
                  style={{ width: `${(distribution[rating as keyof typeof distribution] / total) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{distribution[rating as keyof typeof distribution]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">Ocene uporabnikov</h3>
        {reviews.map((review) => (
          <Card key={review.id} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {review.profiles?.first_name} {review.profiles?.last_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(review.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(review.created_at).toLocaleDateString('sl-SI')}
                  </span>
                </div>
              </div>
            </div>

            {/* Ratings Breakdown */}
            {(review.quality_rating || review.punctuality_rating || review.price_rating) && (
              <div className="flex gap-4 mb-4 pb-4 border-b">
                {review.quality_rating && (
                  <div className="text-sm">
                    <p className="text-gray-600">Kvaliteta: {review.quality_rating}/5</p>
                  </div>
                )}
                {review.punctuality_rating && (
                  <div className="text-sm">
                    <p className="text-gray-600">Točnost: {review.punctuality_rating}/5</p>
                  </div>
                )}
                {review.price_rating && (
                  <div className="text-sm">
                    <p className="text-gray-600">Cena: {review.price_rating}/5</p>
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>
            )}

            {/* Photos */}
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-2 mb-4">
                {review.photos.map((photo: string, idx: number) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`Review photo ${idx + 1}`}
                    className="w-20 h-20 rounded object-cover"
                  />
                ))}
              </div>
            )}

            {/* Reply */}
            {review.obrtnik_reply && (
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <div className="flex gap-2 items-start">
                  <MessageCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Odgovor mojstra</p>
                    <p className="text-sm text-blue-800 mt-1">{review.obrtnik_reply}</p>
                    {review.replied_at && (
                      <p className="text-xs text-blue-600 mt-1">
                        {new Date(review.replied_at).toLocaleDateString('sl-SI')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
