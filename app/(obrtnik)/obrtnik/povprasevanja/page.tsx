import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { PovprasevanjeCard } from '@/components/liftgo/PovprasevanjeCard'
import { Search } from 'lucide-react'

export default async function ObrtnikPovprasevanjaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all open povprasevanja
  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('*, categories(name)')
    .in('status', ['odprto', 'v_teku'])
    .order('created_at', { ascending: false })

  // Get ponudbe counts
  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select('povprasevanje_id')
    .in('povprasevanje_id', povprasevanja?.map(p => p.id) || [])

  const ponudbeByPovprasevanje = ponudbe?.reduce((acc: Record<string, number>, p) => {
    acc[p.povprasevanje_id] = (acc[p.povprasevanje_id] || 0) + 1
    return acc
  }, {}) || {}

  // Get user's ponudbe to show which they already bid on
  const { data: userPonudbe } = await supabase
    .from('ponudbe')
    .select('povprasevanje_id')
    .eq('obrtnik_id', user!.id)

  const userBidIds = new Set(userPonudbe?.map(p => p.povprasevanje_id) || [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Brskaj povpraševanja
        </h1>
        <p className="mt-2 text-muted-foreground">
          Najdite nova povpraševanja in pošljite ponudbe
        </p>
      </div>

      {!povprasevanja || povprasevanja.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-foreground">Trenutno ni odprtih povpraševanj</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Preverite znova kasneje
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {povprasevanja.map((povprasevanje) => (
            <PovprasevanjeCard
              key={povprasevanje.id}
              povprasevanje={povprasevanje}
              ponudbeCount={ponudbeByPovprasevanje[povprasevanje.id] || 0}
              href={`/obrtnik/povprasevanja/${povprasevanje.id}`}
              alreadyBid={userBidIds.has(povprasevanje.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
