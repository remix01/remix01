'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ReviewModalProps {
  povprasevanjId: string
}

export function ReviewModal({ povprasevanjId }: ReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmitReview() {
    setLoading(true)
    setError(null)

    try {
      if (rating === 0) {
        setError('Prosimo, izberite oceno.')
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Niste prijavljeni.')
        setLoading(false)
        return
      }

      // Get the accepted offer for this inquiry
      const { data: offer } = await supabase
        .from('ponudbe')
        .select('id, obrtnik_id')
        .eq('povprasevanje_id', povprasevanjId)
        .eq('status', 'sprejeta')
        .single()

      if (!offer) {
        setError('Sprejeta ponudba ni najdena.')
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create review
      const { error: reviewError } = await supabase.from('ocene').insert({
        ponudba_id: offer.id,
        narocnik_id: user.id,
        obrtnik_id: offer.obrtnik_id,
        rating,
        comment: text || null,
        is_public: true,
      })

      if (reviewError) throw reviewError

      // Refresh page
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error('[v0] Error submitting review:', err)
      setError(err.message || 'Napaka pri oddaji ocene.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-6 py-2"
      >
        Oceni mojstra
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Ocenite mojstra</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Rating */}
          <div>
            <p className="font-medium text-slate-900 mb-3">Kako bi ocenili delo?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block font-medium text-slate-900 mb-2">
              Povratna informacija (neobvezno)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Napišite kaj se vam je dopadlo in kaj bi se dalo izboljšati..."
              className="w-full h-24 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Zaustavi
          </button>
          <button
            onClick={handleSubmitReview}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Se pošilja...' : 'Pošlji oceno'}
          </button>
        </div>
      </div>
    </div>
  )
}
