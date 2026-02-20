import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Euro, CheckCircle2 } from 'lucide-react'
import { RatingStars } from './RatingStars'
import { StatusBadge } from './StatusBadge'
import type { Ponudba, Profile, ObrnikProfile } from '@/types/liftgo.types'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'

interface PonudbaCardProps {
  ponudba: Ponudba & {
    profiles?: Profile & { obrtnik_profiles?: ObrnikProfile }
  }
  onAccept?: () => void
  showActions?: boolean
  isAccepting?: boolean
}

const priceTypeLabels: Record<string, string> = {
  fiksna: 'Fiksna cena',
  ocena: 'Ocena',
  urna_postavka: 'Urna postavka'
}

export function PonudbaCard({ ponudba, onAccept, showActions = true, isAccepting = false }: PonudbaCardProps) {
  const obrtnik = ponudba.profiles
  const obrnikProfile = obrtnik?.obrtnik_profiles
  const initials = obrtnik?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??'

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={obrtnik?.avatar_url || undefined} alt={obrtnik?.full_name || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">
                  {obrnikProfile?.business_name || obrtnik?.full_name}
                </h4>
                {obrnikProfile && (
                  <div className="mt-1 flex items-center gap-2">
                    <RatingStars rating={obrnikProfile.avg_rating || 0} size="sm" showNumber />
                    <span className="text-xs text-muted-foreground">
                      ({obrnikProfile.total_reviews || 0})
                    </span>
                    {obrnikProfile.is_verified && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
              </div>
              <StatusBadge status={ponudba.status} />
            </div>

            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
              {ponudba.message}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {ponudba.price_estimate}€
                </span>
                <span className="text-muted-foreground">
                  ({priceTypeLabels[ponudba.price_type]})
                </span>
              </div>

              {ponudba.available_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Začetek: {format(new Date(ponudba.available_date), 'd. MMM yyyy', { locale: sl })}
                  </span>
                </div>
              )}
            </div>

            {showActions && ponudba.status === 'poslana' && (
              <div className="mt-4">
                <Button 
                  onClick={onAccept} 
                  disabled={isAccepting}
                  className="w-full sm:w-auto"
                >
                  {isAccepting ? 'Sprejemanje...' : 'Sprejmi ponudbo'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Poslano {format(new Date(ponudba.created_at), 'd. MMM yyyy ob HH:mm', { locale: sl })}
        </div>
      </div>
    </Card>
  )
}
