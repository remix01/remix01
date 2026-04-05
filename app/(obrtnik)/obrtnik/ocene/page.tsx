'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  customer_name: string
  task_title: string
}

export default function OcenePage() {
  const router = useRouter()
  const supabase = createClient()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/partner-auth/login')
        return
      }

      // Fetch reviews for this obrtnik
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          tasks (
            title,
            created_by
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data
      const transformedReviews = (data || []).map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        customer_name: review.profiles?.first_name && review.profiles?.last_name
          ? `${review.profiles.first_name} ${review.profiles.last_name}`
          : 'Anonimni uporabnik',
        task_title: review.tasks?.title || 'Zaključena naloga',
      }))

      setReviews(transformedReviews)

      // Calculate average rating
      if (transformedReviews.length > 0) {
        const avg = transformedReviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / transformedReviews.length
        setAverageRating(Math.round(avg * 10) / 10)
      }

      setLoading(false)
    } catch (error) {
      console.error('[v0] Error loading reviews:', error)
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalagam ocene...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Ocene strank</h1>

      {/* Average Rating Card */}
      {reviews.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Povprečna ocena</p>
              <p className="text-4xl font-bold text-gray-900">{averageRating}</p>
              <p className="text-sm text-gray-600 mt-2">Skupaj {reviews.length} ocen</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-12 h-12 ${
                    star <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{review.customer_name}</p>
                    <p className="text-sm text-gray-600">{review.task_title}</p>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-gray-700">{review.comment}</p>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleDateString('sl-SI')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-500 space-y-2">
            <Star className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-lg">Še nimate ocen</p>
            <p className="text-sm">Ko bodo stranke zaključile delo, vam bodo pustile ocene</p>
          </div>
        </Card>
      )}
    </div>
  )
}
