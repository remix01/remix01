import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { RatingStars } from '@/components/liftgo/RatingStars'
import { MapPin, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { sl } from 'date-fns/locale'

export default async function ObrnikProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      obrtnik_profiles(*),
      obrtnik_categories(categories(*))
    `)
    .eq('id', params.id)
    .eq('role', 'obrtnik')
    .single()

  if (!profile) {
    notFound()
  }

  const obrtnik = profile.obrtnik_profiles

  const { data: ocene } = await supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(full_name)
    `)
    .eq('obrtnik_id', params.id)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??'

  const categories = profile.obrtnik_categories?.map((oc: any) => oc.categories) || []

  const handlePosljiPovprasevanje = async () => {
    'use server'
    if (!user) {
      redirect('/prijava')
    }
    
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role === 'narocnik') {
      redirect('/narocnik/novo-povprasevanje')
    } else {
      redirect('/prijava')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                      {obrtnik.business_name}
                    </h1>
                    <p className="mt-1 text-lg text-muted-foreground">{profile.full_name}</p>
                  </div>
                  {obrtnik.is_verified && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Preverjen
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <RatingStars rating={obrtnik.avg_rating || 0} size="md" showNumber />
                  <span className="text-sm text-muted-foreground">
                    {obrtnik.total_reviews || 0} {obrtnik.total_reviews === 1 ? 'ocena' : 'ocen'}
                  </span>
                  {profile.location_city && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {profile.location_city}
                      </div>
                    </>
                  )}
                </div>

                {obrtnik.is_available && (
                  <Badge className="mt-4 bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                    <Clock className="h-3 w-3" />
                    Dosegljiv za nova dela
                  </Badge>
                )}
              </div>
            </div>

            {obrtnik.description && (
              <div className="mt-6 border-t pt-6">
                <h2 className="font-semibold text-foreground mb-2">O nas</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{obrtnik.description}</p>
              </div>
            )}

            {categories.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h2 className="font-semibold text-foreground mb-3">Storitve</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat: any) => (
                    <Badge key={cat.id} variant="secondary">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Ocene ({ocene?.length || 0})
            </h2>

            {!ocene || ocene.length === 0 ? (
              <p className="text-sm text-muted-foreground">Še ni ocen.</p>
            ) : (
              <div className="space-y-4">
                {ocene.map((ocena: any) => (
                  <div key={ocena.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <RatingStars rating={ocena.rating} size="sm" />
                          <span className="text-sm font-medium text-foreground">
                            {ocena.narocnik?.full_name || 'Anonimen'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ocena.created_at), 'd. MMM yyyy', { locale: sl })}
                          </span>
                        </div>
                        {ocena.comment && (
                          <p className="mt-2 text-sm text-muted-foreground">{ocena.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside>
          <Card className="sticky top-20 p-6">
            <h3 className="font-semibold text-foreground mb-4">Zainteresirani?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pošljite brezplačno povpraševanje in prejmite ponudbo.
            </p>
            <form action={handlePosljiPovprasevanje}>
              <Button className="w-full" type="submit">
                Pošlji povpraševanje
              </Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  )
}
