import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { PonudbaCard } from '@/components/liftgo/PonudbaCard'
import { MessageSquare } from 'lucide-react'

export default async function ObrtnikPonudbePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanja!inner(*, categories(name))
    `)
    .eq('obrtnik_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Moje ponudbe
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pregled vseh vaših oddanih ponudb
        </p>
      </div>

      {!ponudbe || ponudbe.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-foreground">Še nimate ponudb</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Brskajte po povprasevanjih in pošljite svojo prvo ponudbo
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ponudbe.map((ponudba) => (
            <PonudbaCard
              key={ponudba.id}
              ponudba={ponudba}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
