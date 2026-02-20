'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from '@/components/liftgo/StatusBadge'
import { UrgencyBadge } from '@/components/liftgo/UrgencyBadge'
import { PonudbaCard } from '@/components/liftgo/PonudbaCard'
import { MapPin, Calendar, Euro, MessageSquare, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'
import type { Povprasevanje, Ponudba, Category } from '@/types/liftgo.types'

export default function PovprasevanjeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [povprasevanje, setPovprasevanje] = useState<(Povprasevanje & { categories?: Category }) | null>(null)
  const [ponudbe, setPonudbe] = useState<Ponudba[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: povData } = await supabase
        .from('povprasevanja')
        .select('*, categories(*)')
        .eq('id', params.id)
        .single()

      setPovprasevanje(povData)

      const { data: ponData } = await supabase
        .from('ponudbe')
        .select(`
          *,
          profiles(*, obrtnik_profiles(*))
        `)
        .eq('povprasevanje_id', params.id)
        .order('created_at', { ascending: false })

      setPonudbe(ponData || [])
    } catch (err) {
      console.error('[v0] Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptPonudba = async (ponudbaId: string) => {
    setIsAccepting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('ponudbe')
        .update({ status: 'sprejeta' })
        .eq('id', ponudbaId)

      if (updateError) throw updateError

      const { error: povError } = await supabase
        .from('povprasevanja')
        .update({ status: 'v_teku' })
        .eq('id', params.id)

      if (povError) throw povError

      await loadData()
    } catch (err) {
      console.error('[v0] Error accepting ponudba:', err)
      setError(err instanceof Error ? err.message : 'Napaka pri sprejemanju ponudbe')
    } finally {
      setIsAccepting(false)
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

  const sprejeta = ponudbe.find(p => p.status === 'sprejeta')

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              <p className="text-sm font-medium text-muted-foreground">Proračun</p>
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

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Prejete ponudbe ({ponudbe.length})
          </h2>
          {sprejeta && povprasevanje.status === 'zakljuceno' && (
            <Button asChild>
              <a href={`/narocnik/ocena/${sprejeta.id}`}>Oddaj oceno</a>
            </Button>
          )}
        </div>

        {ponudbe.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-foreground">Še ni ponudb</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Obrtniki bodo kmalu začeli pošiljati ponudbe
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {ponudbe.map((ponudba) => (
              <PonudbaCard
                key={ponudba.id}
                ponudba={ponudba}
                onAccept={() => handleAcceptPonudba(ponudba.id)}
                showActions={povprasevanje.status === 'odprto'}
                isAccepting={isAccepting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
