import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { RatingStars } from '@/components/liftgo/RatingStars'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

export default async function OcenePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('avg_rating, total_reviews')
    .eq('user_id', user!.id)
    .single()

  const { data: ocene } = await supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(full_name, avatar_url)
    `)
    .eq('obrtnik_id', user!.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const avgRating = obrtnikProfile?.avg_rating || 0
  const totalReviews = obrtnikProfile?.total_reviews || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Ocene</h1>
        <p className="mt-2 text-muted-foreground">
          Pregled vaših ocen od naročnikov
        </p>
      </div>

      <Card className="p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-10 w-10 fill-accent text-accent" />
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground">
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </div>
            <RatingStars rating={avgRating} size="lg" className="mt-2 justify-center" />
            <p className="mt-2 text-sm text-muted-foreground">
              {totalReviews} {totalReviews === 1 ? 'ocena' : totalReviews === 2 ? 'oceni' : 'ocen'}
            </p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
          Vse ocene
        </h2>

        {!ocene || ocene.length === 0 ? (
          <Card className="p-12 text-center">
            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-foreground">Še nimate ocen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ko boste zaključili delo, bodo naročniki lahko oddali oceno
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {ocene.map((ocena) => {
              const narocnik = ocena.narocnik as any
              const initials = narocnik?.full_name
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase() || '??'

              return (
                <Card key={ocena.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={narocnik?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {narocnik?.full_name || 'Anonimni naročnik'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <RatingStars rating={ocena.rating} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(ocena.created_at), {
                                addSuffix: true,
                                locale: sl,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {ocena.comment && (
                        <p className="mt-3 text-sm leading-relaxed text-foreground">
                          {ocena.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
