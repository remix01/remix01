'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ObrtnikReplyForm } from './ObrtnikReplyForm'

interface ReviewsListProps {
  obrtnik_id: string
  currentUserId?: string
}

interface Review {
  id: string
  rating: number
  quality_rating: number | null
  punctuality_rating: number | null
  price_rating: number | null
  comment: string | null
  photos: string[] | null
  obrtnik_reply: string | null
  replied_at: string | null
  created_at: string
  profiles: { full_name: string | null }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const months = [
    'januarja',
    'februarja',
    'marca',
    'aprila',
    'maja',
    'junija',
    'julija',
    'avgusta',
    'septembra',
    'oktobra',
    'novembra',
    'decembra',
  ]
  return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`
}

const RatingStars = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export function ReviewsList({ obrtnik_id, currentUserId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [stats, setStats] = useState({
    avg: 0,
    count: 0,
    distribution: [0, 0, 0, 0, 0],
    avgQuality: 0,
    avgPunctuality: 0,
    avgPrice: 0,
  })

  useEffect(() => {
    loadReviews()
  }, [obrtnik_id])

  const loadReviews = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ocene')
        .select('*, profiles(full_name)')
        .eq('obrtnik_id', obrtnik_id)
        .order('created_at', { ascending: false })
        .range(page * 5, (page + 1) * 5 - 1)

      if (error) throw error

      setReviews(data || [])
      setHasMore((data?.length || 0) >= 5)

      // Calculate stats
      if (data && data.length > 0) {
        const avgRating =
          data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length
        const distribution = [0, 0, 0, 0, 0]
        data.forEach((r: any) => {
          distribution[r.rating - 1]++
        })

        const avgQuality =
          data
            .filter((r: any) => r.quality_rating)
            .reduce((sum: number, r: any) => sum + (r.quality_rating || 0), 0) /
            (data.filter((r: any) => r.quality_rating).length || 1) || 0

        const avgPunctuality =
          data
            .filter((r: any) => r.punctuality_rating)
            .reduce((sum: number, r: any) => sum + (r.punctuality_rating || 0), 0) /
            (data.filter((r: any) => r.punctuality_rating).length || 1) || 0

        const avgPrice =
          data
            .filter((r: any) => r.price_rating)
            .reduce((sum: number, r: any) => sum + (r.price_rating || 0), 0) /
            (data.filter((r: any) => r.price_rating).length || 1) || 0

        setStats({
          avg: avgRating,
          count: data.length,
          distribution,
          avgQuality,
          avgPunctuality,
          avgPrice,
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('[v0] Error loading reviews:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Nalagam ocene...</div>
  }

  if (reviews.length === 0) {
    return <div className="p-6 text-center text-gray-500">Ni ocen</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border-b pb-6">
        <div className="flex items-end gap-4 mb-4">
          <div className="text-5xl font-bold">{stats.avg.toFixed(1)}</div>
          <RatingStars rating={stats.avg} size="lg" />
          <div className="text-gray-500 text-sm">({stats.count} ocen)</div>
        </div>

        {/* Distribution */}
        <div className="space-y-1 mb-4">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = stats.count > 0 ? Math.round((stats.distribution[star - 1] / stats.count) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-2">
                <div className="text-xs w-4">{star}★</div>
                <div className="flex-1 bg-gray-200 rounded h-2 overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-gray-500 w-8 text-right">{pct}%</div>
              </div>
            )
          })}
        </div>

        {/* Sub-averages */}
        <div className="flex gap-4 text-xs">
          <div>Kakovost {stats.avgQuality.toFixed(1)}</div>
          <div>Točnost {stats.avgPunctuality.toFixed(1)}</div>
          <div>Vrednost {stats.avgPrice.toFixed(1)}</div>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-6">
        {reviews.map((review) => {
          const initials = review.profiles.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
          return (
            <div key={review.id} className="border-b pb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {review.profiles.full_name.split(' ')[0]} {review.profiles.full_name.split(' ')[1]?.[0]}.
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(review.created_at)}</div>
                </div>
              </div>

              <RatingStars rating={review.rating} />

              {/* Sub-ratings */}
              <div className="flex gap-3 text-xs mt-2">
                {review.quality_rating && <div>K: {review.quality_rating}</div>}
                {review.punctuality_rating && <div>T: {review.punctuality_rating}</div>}
                {review.price_rating && <div>V: {review.price_rating}</div>}
              </div>

              {/* Comment */}
              {review.comment && <p className="text-sm mt-3 text-gray-700 line-clamp-4">{review.comment}</p>}

              {/* Photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {review.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`review-${idx}`}
                      className="w-full h-20 object-cover rounded cursor-pointer"
                    />
                  ))}
                </div>
              )}

              {/* Craftsman reply */}
              {review.obrtnik_reply && (
                <div className="bg-gray-50 border-l-4 border-blue-500 ml-8 p-4 mt-4">
                  <div className="font-semibold text-sm mb-1">Odgovor mojstra:</div>
                  <p className="text-sm text-gray-700">{review.obrtnik_reply}</p>
                  <div className="text-xs text-gray-500 mt-2">{formatDate(review.replied_at || '')}</div>
                </div>
              )}

              {/* Reply form for owner */}
              {currentUserId === obrtnik_id && !review.obrtnik_reply && (
                <ObrtnikReplyForm reviewId={review.id} onReplyAdded={loadReviews} />
              )}
            </div>
          )
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => {
            setPage(page + 1)
            loadReviews()
          }}
          className="w-full py-2 text-blue-600 hover:bg-gray-50 rounded"
        >
          Naloži več ocen
        </button>
      )}
    </div>
  )
}
