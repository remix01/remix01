import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MapPin, CheckCircle2 } from 'lucide-react'
import { RatingStars } from './RatingStars'
import type { Profile, ObrnikProfile } from '@/types/liftgo.types'

interface ObrnikCardProps {
  profile: Profile & { obrtnik_profiles: ObrnikProfile }
  categories: string[]
}

export function ObrnikCard({ profile, categories }: ObrnikCardProps) {
  const obrtnik = profile.obrtnik_profiles
  const initials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??'

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {obrtnik.business_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {profile.full_name}
                </p>
              </div>
              {obrtnik.is_verified && (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <RatingStars rating={obrtnik.avg_rating || 0} size="sm" showNumber />
              <span className="text-xs text-muted-foreground">
                ({obrtnik.total_reviews || 0})
              </span>
            </div>

            {profile.location_city && (
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{profile.location_city}</span>
              </div>
            )}
          </div>
        </div>

        {obrtnik.description && (
          <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
            {obrtnik.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
          {categories.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{categories.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button asChild className="flex-1">
            <Link href={`/obrtniki/${profile.id}`}>
              Poglej profil
            </Link>
          </Button>
          {obrtnik.is_available && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Dosegljiv
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
