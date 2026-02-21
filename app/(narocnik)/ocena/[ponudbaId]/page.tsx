'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props {
  params: Promise<{ ponudbaId: string }>
}

export default function OcenaPage({ params }: Props) {
  const router = useRouter()
  const paramsValue = params as any
  const ponudbaId = paramsValue.ponudbaId || (params as any).ponudbaId

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [businessName, setBusinessName] = useState<string>('')
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadPonudba() {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/prijava')
          return
        }

        // Fetch ponudba with obrtnik data
        const { data: ponudba, error: fetchError } = await supabase
          .from('ponudbe')
          .select(`
            id,
            narocnik_id:povprasevanja(narocnik_id),
            obrtnik:obrtnik_profiles(
              id,
              business_name,
              profile:profiles(id)
            )
          `)
          .eq('id', ponudbaId)
          .single()

        if (fetchError || !ponudba) {
          setError('Ponudba ni najdena')
          setLoading(false)
          return
        }

        // Security check - verify this is the naročnik who created the povprasevanje
        const povprasevanjeNarocnikId = (ponudba.narocnik_id as any)?.[0]?.narocnik_id
        if (povprasevanjeNarocnikId !== user.id) {
          setError('Nimate dostopa do te ocene')
          setLoading(false)
          return
        }

        setBusinessName(ponudba.obrtnik?.business_name || 'Obrtnik')
        setLoading(false)
      } catch (err) {
        console.error('[v0] Error loading ponudba:', err)
        setError('Napaka pri nalaganju podatkov')
        setLoading(false)
      }
    }

    loadPonudba()
  }, [ponudbaId, router])

  async function handleSubmit() {
    if (rating === 0) {
      setError('Izberite oceno z zvezdicami')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/prijava')
        return
      }

      // Fetch ponudba to get obrtnik_id
      const { data: ponudba, error: fetchError } = await supabase
        .from('ponudbe')
        .select('obrtnik_id')
        .eq('id', ponudbaId)
        .single()

      if (fetchError || !ponudba) {
        setError('Napaka pri nalaganju ponudbe')
        setSubmitting(false)
        return
      }

      // Create ocena
      const { error: createError } = await supabase
        .from('ocene')
        .insert({
          ponudba_id: ponudbaId,
          narocnik_id: user.id,
          obrtnik_id: ponudba.obrtnik_id,
          rating,
          comment: comment || null,
          is_public: true,
        })

      if (createError) {
        if (createError.code === '23505') {
          setError('Ocena že obstaja za to ponudbo')
        } else {
          setError('Napaka pri oddaji ocene. Poskusite znova.')
        }
        setSubmitting(false)
        return
      }

      setSuccessMessage('Ocena oddana! Preusmerim vas...')
      setTimeout(() => {
        router.push('/narocnik/dashboard')
      }, 2000)
    } catch (err) {
      console.error('[v0] Error submitting ocena:', err)
      setError('Napaka pri oddaji ocene. Poskusite znova.')
      setSubmitting(false)
    }
  }

  const ratingLabels = ['', 'Slabo', 'Zadostno', 'Dobro', 'Zelo dobro', 'Odlično']

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-teal-600"></div>
          <p className="text-gray-600">Nalagam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-md px-4 py-8">
        <Card className="p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Ocenite opravljeno delo
          </h1>

          <div className="mb-8 rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">Mojster:</p>
            <p className="font-semibold text-gray-900">{businessName}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-900">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-lg bg-green-100 p-4 text-green-900">
              {successMessage}
            </div>
          )}

          {/* Star Rating */}
          <div className="mb-6">
            <Label className="mb-4 block text-center text-gray-700">
              Kako ste zadovoljni z delom?
            </Label>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <span
                    className={`text-4xl ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
            {(rating || hoverRating) && (
              <p className="mt-3 text-center text-sm font-semibold text-gray-700">
                {ratingLabels[hoverRating || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <Label htmlFor="comment" className="mb-2 block text-gray-700">
              Komentar (neobvezno)
            </Label>
            <Textarea
              id="comment"
              placeholder="Opišite vašo izkušnjo..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="mb-3 w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300"
          >
            {submitting ? 'Oddajam...' : 'Oddaj oceno'}
          </Button>

          {/* Skip Link */}
          <Link href="/narocnik/dashboard">
            <p className="text-center text-sm text-gray-600 hover:text-teal-600">
              Preskoči
            </p>
          </Link>
        </Card>
      </div>
    </div>
  )
}
