'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from '@/components/liftgo/StatusBadge'
import { UrgencyBadge } from '@/components/liftgo/UrgencyBadge'
import { MapPin, Calendar, Euro, Loader2, AlertCircle, CheckCircle, Send } from 'lucide-react'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import type { Povprasevanje, Category } from '@/types/liftgo.types'

export default function ObrtnikPovprasevanjeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [povprasevanje, setPovprasevanje] = useState<(Povprasevanje & { categories?: Category }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const [formData, setFormData] = useState({
    price: '',
    estimated_duration: '',
    message: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: povData } = await supabase
        .from('povprasevanja')
        .select('*, categories(*)')
        .eq('id', params.id)
        .single()

      setPovprasevanje(povData)

      // Check if user already submitted ponudba
      const { data: existingPonudba } = await supabase
        .from('ponudbe')
        .select('id')
        .eq('povprasevanje_id', params.id)
        .eq('obrtnik_id', user.id)
        .maybeSingle()

      setAlreadySubmitted(!!existingPonudba)
    } catch (err) {
      console.error('[v0] Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niste prijavljeni')

      if (!formData.price || !formData.message) {
        throw new Error('Prosimo izpolnite vsa obvezna polja')
      }

      const { error: insertError } = await supabase
        .from('ponudbe')
        .insert({
          povprasevanje_id: params.id as string,
          obrtnik_id: user.id,
          price: parseInt(formData.price),
          estimated_duration: formData.estimated_duration || null,
          message: formData.message,
          status: 'poslana',
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push('/obrtnik/ponudbe')
      }, 2000)
    } catch (err) {
      console.error('[v0] Error submitting ponudba:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri pošiljanju ponudbe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!povprasevanje) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Povpraševanje ne obstaja</p>
      </Card>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            Ponudba poslana!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Naročnik bo prejel vašo ponudbo
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {povprasevanje.title}
            </h1>
            <p className="mt-2 text-muted-foreground whitespace-pre-line">
              {povprasevanje.description}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <StatusBadge status={povprasevanje.status} />
            <UrgencyBadge urgency={povprasevanje.urgency} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
          {povprasevanje.categories && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kategorija</p>
              <Badge variant="secondary" className="mt-1">
                {povprasevanje.categories.name}
              </Badge>
            </div>
          )}

          {povprasevanje.location_city && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lokacija</p>
              <div className="mt-1 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {povprasevanje.location_city}
                  {povprasevanje.location_region && `, ${povprasevanje.location_region}`}
                </span>
              </div>
            </div>
          )}

          {(povprasevanje.preferred_date_from || povprasevanje.preferred_date_to) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Želeni čas izvedbe</p>
              <div className="mt-1 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {povprasevanje.preferred_date_from &&
                    format(new Date(povprasevanje.preferred_date_from), 'd. MMM yyyy', { locale: sl })}
                  {povprasevanje.preferred_date_to &&
                    ` - ${format(new Date(povprasevanje.preferred_date_to), 'd. MMM yyyy', { locale: sl })}`}
                </span>
              </div>
            </div>
          )}

          {(povprasevanje.budget_min || povprasevanje.budget_max) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Proračun naročnika</p>
              <div className="mt-1 flex items-center gap-1">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {povprasevanje.budget_min && povprasevanje.budget_max
                    ? `${povprasevanje.budget_min}€ - ${povprasevanje.budget_max}€`
                    : 'Po dogovoru'}
                </span>
              </div>
            </div>
          )}
        </div>

        {povprasevanje.location_notes && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">Dodatne informacije</p>
            <p className="mt-1 text-sm text-foreground whitespace-pre-line">
              {povprasevanje.location_notes}
            </p>
          </div>
        )}
      </Card>

      {alreadySubmitted ? (
        <Card className="p-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Že ste oddali ponudbo za to povpraševanje
            </AlertDescription>
          </Alert>
          <Button className="mt-4" asChild>
            <a href="/obrtnik/ponudbe">Poglej moje ponudbe</a>
          </Button>
        </Card>
      ) : povprasevanje.status !== 'odprto' ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">To povpraševanje ni več odprto za ponudbe</p>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
            Oddaj ponudbo
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="price">Cena (€) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="1500"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Predviden čas izvedbe</Label>
              <Input
                id="estimated_duration"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                placeholder="npr. 2 tedna"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Sporočilo *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Opišite svojo ponudbo, izkušnje, pristop..."
                rows={6}
                disabled={isSubmitting}
                required
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pošiljanje...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Pošlji ponudbo
                </>
              )}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
