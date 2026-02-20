'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function OcenaPage({ params }: { params: { ponudbaId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [ponudba, setPonudba] = useState<any>(null)

  useEffect(() => {
    async function loadPonudba() {
      const { data, error } = await supabase
        .from('ponudbe')
        .select(`
          *,
          obrtnik:profiles!ponudbe_obrtnik_id_fkey(full_name),
          obrtnik_profile:obrtnik_profiles!ponudbe_obrtnik_id_fkey(business_name)
        `)
        .eq('id', params.ponudbaId)
        .single()

      if (error || !data) {
        toast.error('Napaka pri nalaganju podatkov')
        router.push('/narocnik/dashboard')
        return
      }

      if (data.status !== 'sprejeta') {
        toast.error('Oceno lahko oddate samo za sprejeto ponudbo')
        router.push('/narocnik/dashboard')
        return
      }

      const { data: existingOcena } = await supabase
        .from('ocene')
        .select('id')
        .eq('ponudba_id', params.ponudbaId)
        .single()

      if (existingOcena) {
        toast.error('Oceno ste že oddali')
        router.push('/narocnik/dashboard')
        return
      }

      setPonudba(data)
      setIsLoadingData(false)
    }

    loadPonudba()
  }, [params.ponudbaId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Prosimo, izberite oceno')
      return
    }

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Niste prijavljeni')
        router.push('/prijava')
        return
      }

      const { error } = await supabase.from('ocene').insert({
        ponudba_id: params.ponudbaId,
        narocnik_id: user.id,
        obrtnik_id: ponudba.obrtnik_id,
        rating,
        comment: comment.trim() || null,
        is_public: true,
      })

      if (error) throw error

      toast.success('Ocena uspešno oddana')
      router.push('/narocnik/dashboard')
    } catch (error) {
      console.error('[v0] Error submitting ocena:', error)
      toast.error('Napaka pri oddaji ocene')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const obrtnik = ponudba.obrtnik as any
  const obrtnikProfile = ponudba.obrtnik_profile as any

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/narocnik/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazaj na nadzorno ploščo
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Oddajte oceno
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ocenite storitev: {obrtnikProfile?.business_name || obrtnik?.full_name}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Ocena</Label>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Kako ste zadovoljni s storitvijo?
            </p>

            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const starValue = i + 1
                const isActive = starValue <= (hoveredRating || rating)

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-10 w-10',
                        isActive ? 'fill-accent text-accent' : 'text-muted-foreground/30'
                      )}
                    />
                  </button>
                )
              })}
            </div>

            {rating > 0 && (
              <p className="mt-2 text-sm font-medium text-foreground">
                {rating === 1 && 'Slabo'}
                {rating === 2 && 'Zadovoljivo'}
                {rating === 3 && 'Dobro'}
                {rating === 4 && 'Zelo dobro'}
                {rating === 5 && 'Odlično'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="comment">Komentar (neobvezno)</Label>
            <p className="mb-2 mt-1 text-sm text-muted-foreground">
              Delite svojo izkušnjo z drugimi naročniki
            </p>
            <Textarea
              id="comment"
              placeholder="Opišite svojo izkušnjo s tem obrtnikom..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading || rating === 0} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oddajam...
                </>
              ) : (
                'Oddaj oceno'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/narocnik/dashboard')}
              disabled={isLoading}
            >
              Prekliči
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
