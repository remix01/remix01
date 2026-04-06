import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getObrtnikOcene } from '@/lib/dal/ponudbe'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'

export const metadata = {
  title: 'Ocene | LiftGO',
}

export default async function OcenePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id, business_name, avg_rating, total_reviews')
    .eq('id', user.id)
    .maybeSingle()

  if (!obrtnikProfile) {
    redirect('/prijava')
  }

  const ocene = await getObrtnikOcene(obrtnikProfile.id, 50)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ocene strank</h1>
        <p className="text-sm text-muted-foreground mt-1">{obrtnikProfile.business_name}</p>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${i < Math.round(obrtnikProfile.avg_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
          <div>
            <p className="text-3xl font-bold">
              {obrtnikProfile.avg_rating ? Number(obrtnikProfile.avg_rating).toFixed(1) : '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {obrtnikProfile.total_reviews || 0} ocen skupaj
            </p>
          </div>
        </div>
      </Card>

      {/* Reviews list */}
      {ocene.length === 0 ? (
        <Card className="p-12 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Še nimate ocen</h3>
          <p className="text-muted-foreground">
            Ko stranke zaključijo dela z vami, bodo tukaj vidne njihove ocene.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ocene.map((ocena) => (
            <Card key={ocena.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < ocena.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{ocena.rating}/5</span>
                  </div>
                  {ocena.comment && (
                    <p className="text-sm text-foreground mb-2">{ocena.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {ocena.narocnik?.full_name || 'Anonimna stranka'} · {formatDate(ocena.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
